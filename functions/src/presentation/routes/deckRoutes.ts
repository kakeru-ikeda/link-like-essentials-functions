import { Router } from 'express';

import { DeckService } from '@/application/services/DeckService';
import { DeckRepository } from '@/infrastructure/firestore/repositories/DeckRepository';
import { DeckController } from '@/presentation/controllers/DeckController';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createDeckRouter = (): Router => {
  const router = Router();

  // 依存性注入
  const deckRepository = new DeckRepository();
  const deckService = new DeckService(deckRepository);
  const deckController = new DeckController(deckService);

  // ルーティング定義
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks', authenticate, deckController.getDecks);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/decks/:deckId', authenticate, deckController.getDeck);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/decks', authenticate, deckController.createDeck);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.put('/decks/:deckId', authenticate, deckController.updateDeck);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete('/decks/:deckId', authenticate, deckController.deleteDeck);

  return router;
};
