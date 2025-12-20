import { Deck, DeckCreateInput, DeckUpdateInput } from '../entities/Deck';

export interface IDeckRepository {
  /**
   * デッキ一覧を取得
   */
  findAll(params?: {
    limit?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'viewCount';
    order?: 'asc' | 'desc';
    userId?: string;
    songId?: string;
    tag?: string;
  }): Promise<{ decks: Deck[]; total: number }>;

  /**
   * デッキIDでデッキを取得
   */
  findById(deckId: string): Promise<Deck | null>;

  /**
   * デッキを作成
   */
  create(input: DeckCreateInput): Promise<Deck>;

  /**
   * デッキを更新
   */
  update(deckId: string, input: DeckUpdateInput): Promise<Deck>;

  /**
   * デッキを削除
   */
  delete(deckId: string): Promise<void>;

  /**
   * 閲覧数を増加
   */
  incrementViewCount(deckId: string): Promise<void>;
}
