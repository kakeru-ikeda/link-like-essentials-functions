import { Timestamp } from 'firebase-admin/firestore';

export interface DeckSlot {
  slotId: number; // 0-17
  cardId: string | null;
  limitBreak?: number; // 1-14
}

export interface Deck {
  id: string; // UUID
  userId: string; // 作成者のAuthUID
  name: string;
  slots: DeckSlot[];
  aceSlotId: number | null;
  deckType?: string; // 例: "105期"
  songId?: string;
  memo?: string;
  tags: string[]; // 検索用タグ（サーバーサイドで自動生成）
  viewCount: number; // 閲覧数
  likeCount: number; // いいね数（将来的に実装）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeckCreateInput {
  id: string;
  userId: string;
  name: string;
  slots: DeckSlot[];
  aceSlotId: number | null;
  deckType?: string;
  songId?: string;
  memo?: string;
}

export interface DeckUpdateInput {
  name?: string;
  slots?: DeckSlot[];
  aceSlotId?: number | null;
  deckType?: string;
  songId?: string;
  memo?: string;
}
