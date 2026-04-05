FROM docker.io/ollama/ollama:0.6.3

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

COPY Modelfile /tmp/Modelfile

# コンテナイメージにモデルの重みを焼き込む（起動高速化）
ENV BASE_MODEL gemma4:e4b
ENV MODEL gemma-tuned
RUN ollama serve & \
    for i in $(seq 1 60); do \
    if ollama list > /dev/null 2>&1; then \
    ollama pull $BASE_MODEL; \
    ollama create $MODEL -f /tmp/Modelfile; \
    exit 0; \
    fi; \
    sleep 1; \
    done; \
    echo "ollama serve did not become ready within 60 seconds" >&2; \
    exit 1

ENTRYPOINT ["ollama", "serve"]
