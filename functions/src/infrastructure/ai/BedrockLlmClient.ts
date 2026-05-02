import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConversationRole,
  type ContentBlock,
  type Message,
  type SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

import { InternalServerError } from '@/domain/errors/AppError';
import type { LlmChatRequest, LlmClient } from '@/infrastructure/ai/LlmClient';

interface BedrockLlmClientConfig {
  region: string;
  timeoutMs: number;
}

export class BedrockLlmClient implements LlmClient {
  private readonly client: BedrockRuntimeClient;

  constructor(private readonly config: BedrockLlmClientConfig) {
    this.client = new BedrockRuntimeClient({
      region: config.region,
      maxAttempts: 2,
    });
  }

  async chat(request: LlmChatRequest): Promise<string> {
    const command = new ConverseCommand({
      modelId: request.model,
      system: this.toSystemBlocks(request),
      messages: this.toMessages(request),
      inferenceConfig: this.toInferenceConfig(request),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await this.client.send(command, {
        abortSignal: controller.signal,
      });
      return this.extractText(response.output?.message?.content ?? []);
    } catch (cause) {
      const errorName = cause instanceof Error ? cause.name : 'UnknownError';
      if (errorName === 'AbortError') {
        this.logBedrockError(cause, request.model);
        throw new InternalServerError(
          'LLM エンジンの応答がタイムアウトしました'
        );
      }
      this.logBedrockError(cause, request.model);
      throw new InternalServerError('Amazon Bedrock への接続に失敗しました');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private logBedrockError(cause: unknown, modelId: string): void {
    const error = cause instanceof Error ? cause : undefined;
    const metadata = this.getMetadata(cause);

    console.error('[BedrockLlmClient] Bedrock request failed', {
      errorName: error?.name ?? 'UnknownError',
      errorMessage: error?.message,
      httpStatusCode: metadata?.httpStatusCode,
      requestId: metadata?.requestId,
      attempts: metadata?.attempts,
      region: this.config.region,
      modelId,
    });
  }

  private getMetadata(
    cause: unknown
  ):
    | { httpStatusCode?: number; requestId?: string; attempts?: number }
    | undefined {
    if (!cause || typeof cause !== 'object' || !('$metadata' in cause)) {
      return undefined;
    }

    const metadata = (cause as { $metadata?: Record<string, unknown> })
      .$metadata;
    if (!metadata) return undefined;

    return {
      httpStatusCode:
        typeof metadata.httpStatusCode === 'number'
          ? metadata.httpStatusCode
          : undefined,
      requestId:
        typeof metadata.requestId === 'string' ? metadata.requestId : undefined,
      attempts:
        typeof metadata.attempts === 'number' ? metadata.attempts : undefined,
    };
  }

  private toInferenceConfig(request: LlmChatRequest): {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  } {
    const temperature = request.options?.temperature;

    return {
      temperature,
      topP: temperature === undefined ? request.options?.topP : undefined,
      maxTokens: request.options?.maxTokens,
    };
  }

  private toSystemBlocks(request: LlmChatRequest): SystemContentBlock[] {
    const systemText = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    if (!systemText) return [];
    return [{ text: systemText }];
  }

  private toMessages(request: LlmChatRequest): Message[] {
    return request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role as ConversationRole,
        content: [{ text: message.content }],
      }));
  }

  private extractText(contentBlocks: ContentBlock[]): string {
    for (const contentBlock of contentBlocks) {
      if ('toolUse' in contentBlock && contentBlock.toolUse?.input) {
        return JSON.stringify(contentBlock.toolUse.input);
      }
    }

    const text = contentBlocks
      .map((contentBlock) => ('text' in contentBlock ? contentBlock.text : ''))
      .filter((content): content is string => Boolean(content))
      .join('');

    if (!text) {
      throw new InternalServerError('LLM のレスポンスが空です');
    }

    return text;
  }
}
