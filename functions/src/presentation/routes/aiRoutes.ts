import { Router } from 'express';

import { AiController } from '@/presentation/controllers/AiController';
import { createCardFilterAiService } from '@/presentation/factories/aiServiceFactory';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createAiRouter = (): Router => {
  const router = Router();

  const cardFilterAiService = createCardFilterAiService();
  const aiController = new AiController(cardFilterAiService);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/ai/cards/filter-query',
    authenticate,
    aiController.generateCardFilter
  );

  return router;
};
