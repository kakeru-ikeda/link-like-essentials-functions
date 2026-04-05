import { GoogleAuth } from 'google-auth-library';

import { InternalServerError } from '@/domain/errors/AppError';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
  format?: string;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * Ollama HTTP API クライアント（汎用 LLM インフラ層）
 *
 * 認証: Cloud Run へのサービス間通信には OIDC トークンを使用する。
 * ローカル開発時（OLLAMA_BASE_URL が localhost の場合）は認証をスキップする。
 */
export class OllamaClient {
  constructor(private readonly baseUrl: string) {}

  async chat(request: OllamaChatRequest): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const body = JSON.stringify({ ...request, stream: false });

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Cloud Run（非 localhost）の場合は OIDC トークンで認証
    if (
      !this.baseUrl.includes('localhost') &&
      !this.baseUrl.includes('127.0.0.1')
    ) {
      // Cloud Run の OIDC audience はベース URL（パスなし）である必要がある
      const audience = this.baseUrl.replace(/\/$/, '');
      const auth = new GoogleAuth();
      const idTokenClient = await auth.getIdTokenClient(audience);
      const idTokenHeaders = await idTokenClient.getRequestHeaders(url);
      // getRequestHeaders は Headers オブジェクトを返す場合があるため、plain object に変換
      const flatHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(idTokenHeaders)) {
        if (typeof v === 'string') flatHeaders[k] = v;
      }
      headers = { ...headers, ...flatHeaders };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
    } catch (cause) {
      throw new InternalServerError('LLM エンジンへの接続に失敗しました');
    }

    if (!response.ok) {
      throw new InternalServerError(
        `LLM エンジンがエラーを返しました: ${response.status}`
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message.content;
  }
}
