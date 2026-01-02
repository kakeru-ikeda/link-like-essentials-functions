import { DeckService } from '@/application/services/DeckService';
import { DeckRepository } from '@/infrastructure/firestore/repositories/DeckRepository';
import { UserRepository } from '@/infrastructure/firestore/repositories/UserRepository';
import { DeckImageStorage } from '@/infrastructure/storage/DeckImageStorage';

export const createDeckService = (): DeckService => {
  const deckRepository = new DeckRepository();
  const userRepository = new UserRepository();
  const deckImageStorage = new DeckImageStorage();

  return new DeckService(deckRepository, userRepository, deckImageStorage);
};
