import { DeckService } from '@/application/services/DeckService';
import { NotificationService } from '@/application/services/NotificationService';
import { DeckRepository } from '@/infrastructure/firestore/repositories/DeckRepository';
import { UserRepository } from '@/infrastructure/firestore/repositories/UserRepository';
import { DiscordNotifier } from '@/infrastructure/notification/DiscordNotifier';
import { DeckImageStorage } from '@/infrastructure/storage/DeckImageStorage';

export const createDeckService = (): DeckService => {
  const deckRepository = new DeckRepository();
  const userRepository = new UserRepository();
  const deckImageStorage = new DeckImageStorage();
  const notificationService = new NotificationService(new DiscordNotifier());

  return new DeckService(
    deckRepository,
    userRepository,
    deckImageStorage,
    notificationService
  );
};
