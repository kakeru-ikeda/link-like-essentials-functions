FROM ollama/ollama:latest

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
RUN ollama serve & sleep 10 && ollama pull $MODEL

ENTRYPOINT ["ollama", "serve"]
