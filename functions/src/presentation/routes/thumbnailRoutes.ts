import { Router } from 'express';

import { ThumbnailController } from '@/presentation/controllers/ThumbnailController';
import { createThumbnailService } from '@/presentation/factories/thumbnailServiceFactory';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createThumbnailRouter = (): Router => {
  const router = Router();

  const thumbnailService = createThumbnailService();
  const thumbnailController = new ThumbnailController(thumbnailService);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/thumbnails/generate',
    authenticate,
    thumbnailController.generateThumbnail
  );

  return router;
};
