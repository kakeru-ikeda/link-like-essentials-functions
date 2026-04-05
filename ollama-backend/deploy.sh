#!/bin/bash
set -euo pipefail

# =============================================================================
# LLM エンジン (Cloud Run + NVIDIA L4) デプロイスクリプト
# 使い方:
#   ./deploy.sh              # ビルド & デプロイ
#   ./deploy.sh --build-only # イメージビルドのみ（デプロイしない）
#   ./deploy.sh --deploy-only # デプロイのみ（ビルド済みイメージを使用）
# =============================================================================

# --- 設定 ---
PROJECT_ID="link-like-essentials"
REGION="asia-southeast1"       # Cloud Run デプロイリージョン（NVIDIA L4 対応）
ARTIFACT_REGION="asia-northeast1"  # Artifact Registry リージョン（既存）
SERVICE_NAME="lles-llm-engine"
REPO_NAME="lles-llm"
IMAGE_NAME="ollama-gemma4"
IMAGE_TAG="latest"

IMAGE_URI="${ARTIFACT_REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

CLOUD_RUN_CPU=8
CLOUD_RUN_MEMORY="32Gi"
CLOUD_RUN_CONCURRENCY=4
CLOUD_RUN_TIMEOUT=120
CLOUD_RUN_MIN_INSTANCES=0
CLOUD_RUN_MAX_INSTANCES=2

# --- オプション解析 ---
BUILD=true
DEPLOY=true

for arg in "$@"; do
  case $arg in
    --build-only)  DEPLOY=false ;;
    --deploy-only) BUILD=false ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================"
echo " LLM Engine Deploy"
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Service : ${SERVICE_NAME}"
echo "  Image   : ${IMAGE_URI}"
echo "  Build   : ${BUILD}"
echo "  Deploy  : ${DEPLOY}"
echo "================================================"

# --- Artifact Registry リポジトリ作成（初回のみ）---
if gcloud artifacts repositories describe "${REPO_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${ARTIFACT_REGION}" &>/dev/null; then
  echo "[skip] Artifact Registry repository '${REPO_NAME}' already exists."
else
  echo "[create] Creating Artifact Registry repository '${REPO_NAME}'..."
  gcloud artifacts repositories create "${REPO_NAME}" \
    --project="${PROJECT_ID}" \
    --repository-format=docker \
    --location="${ARTIFACT_REGION}" \
    --description="LLM engine images for LLES"
fi

# --- ビルド ---
if [ "${BUILD}" = "true" ]; then
  echo ""
  echo "[build] Submitting Cloud Build..."
  echo "  NOTE: モデル重みの焼き込みにより 10〜20 分かかります"
  gcloud builds submit "${SCRIPT_DIR}" \
    --project="${PROJECT_ID}" \
    --tag="${IMAGE_URI}" \
    --machine-type=e2-highcpu-32
  echo "[build] Done: ${IMAGE_URI}"
fi

# --- デプロイ ---
if [ "${DEPLOY}" = "true" ]; then
  echo ""
  echo "[deploy] Deploying to Cloud Run..."
  gcloud run deploy "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --image="${IMAGE_URI}" \
    --region="${REGION}" \
    --gpu=1 \
    --gpu-type=nvidia-l4 \
    --cpu="${CLOUD_RUN_CPU}" \
    --memory="${CLOUD_RUN_MEMORY}" \
    --concurrency="${CLOUD_RUN_CONCURRENCY}" \
    --timeout="${CLOUD_RUN_TIMEOUT}" \
    --min-instances="${CLOUD_RUN_MIN_INSTANCES}" \
    --max-instances="${CLOUD_RUN_MAX_INSTANCES}" \
    --no-allow-unauthenticated \
    --port=8080

  SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format="value(status.url)")

  echo ""
  echo "================================================"
  echo " Deploy complete!"
  echo "  Service URL: ${SERVICE_URL}"
  echo ""
  echo " .env.local の OLLAMA_BASE_URL を更新してください:"
  echo "  OLLAMA_BASE_URL=${SERVICE_URL}"
  echo "================================================"
fi
