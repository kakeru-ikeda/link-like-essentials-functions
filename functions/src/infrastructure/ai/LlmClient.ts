export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatRequest {
  model: string;
  messages: LlmMessage[];
  responseFormat?: 'json' | 'text';
  options?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
  };
}

export interface LlmClient {
  chat(request: LlmChatRequest): Promise<string>;
}
