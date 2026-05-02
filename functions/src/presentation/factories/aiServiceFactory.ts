import { AiFeedbackService } from '@/application/services/AiFeedbackService';
import { CardFilterAiService } from '@/application/services/CardFilterAiService';
import { BedrockLlmClient } from '@/infrastructure/ai/BedrockLlmClient';
import type { LlmClient } from '@/infrastructure/ai/LlmClient';
import { OllamaClient } from '@/infrastructure/ai/OllamaClient';
import { AiFeedbackRepository } from '@/infrastructure/firestore/repositories/AiFeedbackRepository';
import { PromptLoader } from '@/infrastructure/prompt/PromptLoader';

export const createCardFilterAiService = (): CardFilterAiService => {
  const provider = getEnv('AI_PROVIDER', 'bedrock');
  const { llmClient, model } = createLlmClient(provider);
  const generationOptions = {
    temperature: getNumberEnv('BEDROCK_TEMPERATURE', 0),
    topP: getNumberEnv('BEDROCK_TOP_P', 0.9),
    maxTokens: getNumberEnv('BEDROCK_MAX_TOKENS', 1024),
  };

  const promptLoader = new PromptLoader();
  return new CardFilterAiService(
    llmClient,
    model,
    promptLoader,
    'v1',
    generationOptions
  );
};

const createLlmClient = (
  provider: string
): { llmClient: LlmClient; model: string } => {
  if (provider === 'ollama') {
    const baseUrl = getEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
    const model = getEnv('OLLAMA_MODEL', 'gemma-tuned');
    return { llmClient: new OllamaClient(baseUrl), model };
  }

  const region = getEnv('BEDROCK_REGION', 'ap-northeast-1');
  const model = getEnv(
    'BEDROCK_MODEL_ID',
    'global.anthropic.claude-haiku-4-5-20251001-v1:0'
  );
  const timeoutMs = getNumberEnv('BEDROCK_TIMEOUT_MS', 60000);

  return {
    llmClient: new BedrockLlmClient({ region, timeoutMs }),
    model,
  };
};

const getEnv = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value && value.trim() ? value : fallback;
};

const getNumberEnv = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (!value || !value.trim()) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const createAiFeedbackService = (): AiFeedbackService => {
  const aiFeedbackRepository = new AiFeedbackRepository();
  return new AiFeedbackService(aiFeedbackRepository);
};
