import type { Timestamp } from 'firebase-admin/firestore';

import type {
  DeckComment,
  DeckCommentReport,
  DeckReport,
  GetDecksParams,
  GetLikedDecksParams,
  PageInfo,
  PopularHashtag,
  PopularHashtagSummary,
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
    currentUserId?: string,
    options?: { includeUnlisted?: boolean }
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }>;

  /**
   * 指定ユーザーがいいねしたデッキ一覧を取得（ページネーション付き）
   */
  findLikedDecksByUser(
    userId: string,
    params: GetLikedDecksParams
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
   * 公開デッキを論理削除
   */
  softDeleteDeck(id: string): Promise<void>;

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

  /**
   * コメントを1件取得
   */
  findCommentById(commentId: string): Promise<DeckComment | null>;

  /**
   * コメントを論理削除
   */
  softDeleteComment(commentId: string): Promise<void>;

  /**
   * デッキ配下のコメントを論理削除
   */
  softDeleteCommentsByDeckId(deckId: string): Promise<void>;

  // ========== Report CRUD ==========
  /**
   * 通報レコードを作成
   */
  createReport(report: Omit<DeckReport, 'id'>): Promise<DeckReport>;

  /**
   * コメント通報レコードを作成
   */
  createCommentReport(
    report: Omit<DeckCommentReport, 'id'>
  ): Promise<DeckCommentReport>;

  /**
   * デッキの通報を行ったユニークユーザー数を取得
   */
  countDeckReportsByUsers(deckId: string): Promise<number>;

  /**
   * コメントの通報を行ったユニークユーザー数を取得
   */
  countCommentReportsByUsers(
    deckId: string,
    commentId: string
  ): Promise<number>;

  // ========== Batch Operations ==========
  /**
   * デッキに関連する全データを削除（いいね、閲覧、コメント）
   */
  deleteDeckRelatedData(deckId: string): Promise<void>;

  // ========== Hashtag Aggregation ==========
  /**
   * 指定日時以降のハッシュタグを集計
   */
  aggregatePopularHashtagsSince(
    since: Timestamp,
    limit: number
  ): Promise<PopularHashtag[]>;

  /**
   * 集計結果を保存
   */
  savePopularHashtags(
    periodDays: number,
    hashtags: PopularHashtag[],
    aggregatedAt: Timestamp
  ): Promise<void>;

  /**
   * 集計済みの人気ハッシュタグを取得
   */
  findPopularHashtags(
    periodDays: number
  ): Promise<PopularHashtagSummary | null>;
}
