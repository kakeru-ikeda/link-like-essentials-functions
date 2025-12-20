import { Deck, DeckCreateInput, DeckUpdateInput } from '@/domain/entities/Deck';
import { ForbiddenError, NotFoundError } from '@/domain/errors/AppError';
import { IDeckRepository } from '@/domain/repositories/IDeckRepository';

export class DeckService {
  constructor(private deckRepository: IDeckRepository) {}

  async getDecks(params?: {
    limit?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'viewCount';
    order?: 'asc' | 'desc';
    userId?: string;
    songId?: string;
    tag?: string;
  }): Promise<{ decks: Deck[]; total: number }> {
    return await this.deckRepository.findAll(params);
  }

  async getDeck(deckId: string): Promise<Deck> {
    const deck = await this.deckRepository.findById(deckId);

    if (!deck) {
      throw new NotFoundError('デッキが見つかりません');
    }

    // 閲覧数を増加
    await this.deckRepository.incrementViewCount(deckId);

    return deck;
  }

  async createDeck(input: DeckCreateInput): Promise<Deck> {
    return await this.deckRepository.create(input);
  }

  async updateDeck(
    deckId: string,
    userId: string,
    input: DeckUpdateInput
  ): Promise<Deck> {
    // 既存デッキの取得
    const existingDeck = await this.deckRepository.findById(deckId);

    if (!existingDeck) {
      throw new NotFoundError('デッキが見つかりません');
    }

    // 権限チェック（自分のデッキのみ更新可能）
    if (existingDeck.userId !== userId) {
      throw new ForbiddenError('このデッキを更新する権限がありません');
    }

    return await this.deckRepository.update(deckId, input);
  }

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    // 既存デッキの取得
    const existingDeck = await this.deckRepository.findById(deckId);

    if (!existingDeck) {
      throw new NotFoundError('デッキが見つかりません');
    }

    // 権限チェック（自分のデッキのみ削除可能）
    if (existingDeck.userId !== userId) {
      throw new ForbiddenError('このデッキを削除する権限がありません');
    }

    await this.deckRepository.delete(deckId);
  }
}
