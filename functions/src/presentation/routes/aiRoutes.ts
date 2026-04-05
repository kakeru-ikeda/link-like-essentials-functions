import { Router } from 'express';

import { AiController } from '@/presentation/controllers/AiController';
import {
  createAiFeedbackService,
  createCardFilterAiService,
} from '@/presentation/factories/aiServiceFactory';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createAiRouter = (): Router => {
  const router = Router();

  const cardFilterAiService = createCardFilterAiService();
  const aiFeedbackService = createAiFeedbackService();
  const aiController = new AiController(cardFilterAiService, aiFeedbackService);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/ai/cards/filter-query',
    authenticate,
    aiController.generateCardFilter
  );

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/ai/cards/filter-query/feedback',
    authenticate,
    aiController.submitFeedback
  );

  return router;
};
