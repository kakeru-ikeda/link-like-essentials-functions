import type {
  DeckComment,
  DeckReport,
  GetDecksParams,
  PageInfo,
  PublishedDeck,
} from '../entities/Deck';

export interface IDeckRepository {
  // ========== Deck CRUD ==========
  /**
   * デッキを保存（データアクセスのみ）
   */
  saveDeck(deck: PublishedDeck): Promise<PublishedDeck>;

  /**
   * 公開デッキ一覧を取得（ページネーション付き）
   */
  findPublishedDecks(
    params: GetDecksParams,
    currentUserId?: string
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }>;

  /**
   * 公開デッキを1件取得
   */
  findPublishedDeckById(
    id: string,
    currentUserId?: string
  ): Promise<PublishedDeck | null>;

  /**
   * 公開デッキを更新
   */
  updateDeck(id: string, data: Partial<PublishedDeck>): Promise<void>;

  /**
   * 公開デッキを削除
   */
  deleteDeck(id: string): Promise<void>;

  // ========== Like CRUD ==========
  /**
   * いいねレコードを作成
   */
  createLike(deckId: string, userId: string): Promise<void>;

  /**
   * いいねレコードを削除
   */
  deleteLike(deckId: string, userId: string): Promise<void>;

  /**
   * いいねしているか確認
   */
  hasLiked(deckId: string, userId: string): Promise<boolean>;

  // ========== View CRUD ==========
  /**
   * 閲覧レコードを作成
   */
  createView(deckId: string, userId: string): Promise<void>;

  /**
   * 閲覧履歴が存在するか確認
   */
  hasViewed(deckId: string, userId: string): Promise<boolean>;

  // ========== Comment CRUD ==========
  /**
   * コメントを作成
   */
  createComment(comment: Omit<DeckComment, 'id'>): Promise<DeckComment>;

  /**
   * コメント一覧を取得
   */
  findCommentsByDeckId(deckId: string): Promise<DeckComment[]>;

  // ========== Report CRUD ==========
  /**
   * 通報レコードを作成
   */
  createReport(report: Omit<DeckReport, 'id'>): Promise<DeckReport>;

  // ========== Batch Operations ==========
  /**
   * デッキに関連する全データを削除（いいね、閲覧、コメント）
   */
  deleteDeckRelatedData(deckId: string): Promise<void>;
}
