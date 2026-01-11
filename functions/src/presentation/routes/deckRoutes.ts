import { Router } from 'express';

import { DeckController } from '@/presentation/controllers/DeckController';
import { createDeckService } from '@/presentation/factories/deckServiceFactory';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createDeckRouter = (): Router => {
  const router = Router();

  // 依存性注入
  const deckService = createDeckService();
  const deckController = new DeckController(deckService);

  // ルーティング定義
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get(
    '/decks/hashtags',
    authenticate,
    deckController.getPopularHashtags
  );
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks', authenticate, deckController.getDecks);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks/me', authenticate, deckController.getMyDecks);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks/me/likes', authenticate, deckController.getLikedDecks);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks/:id', authenticate, deckController.getDeckById);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/decks/publish', authenticate, deckController.publishDeck);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete('/decks/:id', authenticate, deckController.deleteDeck);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/decks/:id/like', authenticate, deckController.addLike);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete('/decks/:id/like', authenticate, deckController.removeLike);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/decks/:id/view',
    authenticate,
    deckController.incrementViewCount
  );
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/decks/:id/comments', authenticate, deckController.addComment);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/decks/:id/comments/:commentId/report',
    authenticate,
    deckController.reportComment
  );
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete(
    '/decks/:id/comments/:commentId',
    authenticate,
    deckController.deleteComment
  );
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks/:id/comments', authenticate, deckController.getComments);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/decks/:id/report', authenticate, deckController.reportDeck);

  return router;
};
