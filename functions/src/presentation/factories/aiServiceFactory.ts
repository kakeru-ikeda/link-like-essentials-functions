import { CardFilterAiService } from '@/application/services/CardFilterAiService';
import { OllamaClient } from '@/infrastructure/ai/OllamaClient';

export const createCardFilterAiService = (): CardFilterAiService => {
  const baseUrl = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  const model = process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b';

  const ollamaClient = new OllamaClient(baseUrl);
  return new CardFilterAiService(ollamaClient, model);
};
