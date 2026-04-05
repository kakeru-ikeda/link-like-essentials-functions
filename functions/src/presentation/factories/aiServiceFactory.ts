import { CardFilterAiService } from '@/application/services/CardFilterAiService';
import { OllamaClient } from '@/infrastructure/ai/OllamaClient';
import { PromptLoader } from '@/infrastructure/prompt/PromptLoader';

export const createCardFilterAiService = (): CardFilterAiService => {
  const baseUrl = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  const model = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';

  const ollamaClient = new OllamaClient(baseUrl);
  const promptLoader = new PromptLoader();
  return new CardFilterAiService(ollamaClient, model, promptLoader);
};
