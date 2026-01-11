import type { Timestamp } from 'firebase-admin/firestore';

/**
 * デッキスロット（クラウド用）
 */
export interface DeckSlotForCloud {
  slotId: number;
  cardId: string | null;
  limitBreak?: number;
}

/**
 * デッキ基本情報（クラウド用）
 *
 */
export interface DeckForCloud {
  id: string;
  name: string;
  slots: DeckSlotForCloud[];
  aceSlotId: number | null;
  deckType?: string;
  songId?: string;
  liveGrandPrixId?: string;
  liveGrandPrixDetailId?: string;
  score?: number;
  memo?: string;
  createdAt?: string; // オプショナル: クライアント側のタイムスタンプ（サーバー側では無視される）
  updatedAt?: string; // オプショナル: クライアント側のタイムスタンプ（サーバー側では無視される）
}

/**
 * 公開済みデッキ型（Firestore格納用）
 */
export interface PublishedDeck {
  id: string;
  deck: DeckForCloud;
  userId: string;
  userName: string;
  comment?: string;
  hashtags: string[];
  imageUrls?: string[];
  thumbnail?: string;
  isUnlisted?: boolean;
  isDeleted?: boolean;
  viewCount: number;
  likeCount: number;
  likedByCurrentUser?: boolean;
  publishedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * デッキ公開リクエスト（フロントエンドから受信）
 */
export type DeckPublicationRequest = Pick<
  PublishedDeck,
  | 'id'
  | 'deck'
  | 'comment'
  | 'hashtags'
  | 'imageUrls'
  | 'thumbnail'
  | 'isUnlisted'
>;

/**
 * デッキコメント型
 */
export interface DeckComment {
  id: string;
  deckId: string;
  userId: string;
  userName: string;
  text: string;
  isDeleted?: boolean;
  createdAt: Timestamp;
}

/**
 * デッキ通報型
 */
export interface DeckReport {
  id: string;
  deckId: string;
  reportedBy: string;
  reason: 'inappropriate_content' | 'spam' | 'copyright' | 'other';
  details?: string;
  createdAt: Timestamp;
}

/**
 * デッキコメント通報型
 */
export interface DeckCommentReport {
  id: string;
  deckId: string;
  commentId: string;
  reportedBy: string;
  reason: DeckReport['reason'];
  details?: string;
  createdAt: Timestamp;
}

/**
 * ページネーション情報
 */
export interface PageInfo {
  currentPage: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 人気ハッシュタグ情報
 */
export interface PopularHashtag {
  hashtag: string;
  count: number;
}

/**
 * 人気ハッシュタグ集計結果
 */
export interface PopularHashtagSummary {
  periodDays: number;
  hashtags: PopularHashtag[];
  aggregatedAt: Timestamp;
}

/**
 * デッキ一覧取得パラメータ
 */
export interface GetDecksParams {
  page?: number;
  perPage?: number;
  orderBy?: 'publishedAt' | 'viewCount' | 'likeCount';
  order?: 'asc' | 'desc';
  userId?: string;
  songId?: string;
  tag?: string;
}

export interface GetLikedDecksParams {
  page?: number;
  perPage?: number;
}
