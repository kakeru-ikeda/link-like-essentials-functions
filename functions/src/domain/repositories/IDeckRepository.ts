import type {
  DeckComment,
  DeckPublicationRequest,
  DeckReport,
  GetDecksParams,
  PageInfo,
  PublishedDeck,
} from '../entities/Deck';

export interface IDeckRepository {
  /**
   * デッキを公開
   */
  publishDeck(
    request: DeckPublicationRequest,
    userId: string,
    userName: string
  ): Promise<PublishedDeck>;

  /**
   * 公開デッキ一覧を取得（ページネーション付き）
   */
  findPublishedDecks(
    params: GetDecksParams
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }>;

  /**
   * 公開デッキを1件取得
   */
  findPublishedDeckById(id: string): Promise<PublishedDeck | null>;

  /**
   * 公開デッキを削除
   */
  deleteDeck(id: string, userId: string): Promise<void>;

  /**
   * いいねを追加
   */
  addLike(deckId: string, userId: string): Promise<number>;

  /**
   * いいねを削除
   */
  removeLike(deckId: string, userId: string): Promise<number>;

  /**
   * いいねしているか確認
   */
  hasLiked(deckId: string, userId: string): Promise<boolean>;

  /**
   * 閲覧数をカウント
   */
  incrementViewCount(deckId: string, userId: string): Promise<number>;

  /**
   * コメントを追加
   */
  addComment(
    deckId: string,
    userId: string,
    userName: string,
    text: string
  ): Promise<DeckComment>;

  /**
   * コメント一覧を取得
   */
  findCommentsByDeckId(deckId: string): Promise<DeckComment[]>;

  /**
   * デッキを通報
   */
  reportDeck(
    deckId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<DeckReport>;
}
