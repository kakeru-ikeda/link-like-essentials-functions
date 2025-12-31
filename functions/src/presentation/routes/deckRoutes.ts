import { Router } from 'express';

import { DeckService } from '@/application/services/DeckService';
import { DeckRepository } from '@/infrastructure/firestore/repositories/DeckRepository';
import { UserRepository } from '@/infrastructure/firestore/repositories/UserRepository';
import { DeckImageStorage } from '@/infrastructure/storage/DeckImageStorage';
import { DeckController } from '@/presentation/controllers/DeckController';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createDeckRouter = (): Router => {
  const router = Router();

  // 依存性注入
  const deckRepository = new DeckRepository();
  const userRepository = new UserRepository();
  const deckImageStorage = new DeckImageStorage();
  const deckService = new DeckService(
    deckRepository,
    userRepository,
    deckImageStorage
  );
  const deckController = new DeckController(deckService);

  // ルーティング定義
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks', authenticate, deckController.getDecks);
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
  router.post('/decks/:id/report', authenticate, deckController.reportDeck);

  return router;
};
