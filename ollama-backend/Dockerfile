FROM ollama/ollama:0.5.7

# Cloud Run はポート 8080 で待ち受ける
ENV OLLAMA_HOST 0.0.0.0:8080

# モデルの重みの保存先
ENV OLLAMA_MODELS /models

# ログの詳細度を下げる
ENV OLLAMA_DEBUG false

# GPU メモリからモデルをアンロードしない
ENV OLLAMA_KEEP_ALIVE -1

# 並列リクエスト数（Cloud Run の --concurrency と合わせる）
ENV OLLAMA_NUM_PARALLEL 4

# コンテナイメージにモデルの重みを焼き込む（起動高速化）
ENV MODEL gemma4:e4b
RUN ollama serve & \
    for i in $(seq 1 60); do \
    if curl -fsS http://127.0.0.1:8080/ > /dev/null 2>&1; then \
    ollama pull $MODEL; \
    exit 0; \
    fi; \
    sleep 1; \
    done; \
    echo "ollama serve did not become ready within 60 seconds" >&2; \
    exit 1

ENTRYPOINT ["ollama", "serve"]
