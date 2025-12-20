import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  Deck,
  DeckCreateInput,
  DeckUpdateInput,
} from '@/domain/entities/Deck';
import { NotFoundError } from '@/domain/errors/AppError';
import type { IDeckRepository } from '@/domain/repositories/IDeckRepository';
import { FirestoreClient } from '@/infrastructure/firestore/FirestoreClient';

export class DeckRepository implements IDeckRepository {
  private readonly COLLECTION_NAME = 'decks';
  private firestoreClient: FirestoreClient;

  constructor() {
    this.firestoreClient = new FirestoreClient();
  }

  /**
   * タグを自動生成
   */
  private generateTags(deck: DeckCreateInput | DeckUpdateInput): string[] {
    const tags = new Set<string>();

    if ('deckType' in deck && deck.deckType) {
      tags.add(deck.deckType);
    }

    if ('songId' in deck && deck.songId) {
      tags.add(`song:${deck.songId}`);
    }

    return Array.from(tags);
  }

  async findAll(params?: {
    limit?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'viewCount';
    order?: 'asc' | 'desc';
    userId?: string;
    songId?: string;
    tag?: string;
  }): Promise<{ decks: Deck[]; total: number }> {
    const limit = params?.limit ?? 20;
    const orderBy = params?.orderBy ?? 'updatedAt';
    const order = params?.order ?? 'desc';

    let query = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .limit(limit > 100 ? 100 : limit);

    // フィルタリング
    if (params?.userId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      query = query.where('userId', '==', params.userId) as any;
    }

    if (params?.songId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      query = query.where('songId', '==', params.songId) as any;
    }

    if (params?.tag) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      query = query.where('tags', 'array-contains', params.tag) as any;
    }

    // ソート
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    query = query.orderBy(orderBy, order) as any;

    const snapshot = await query.get();

    const decks: Deck[] = snapshot.docs.map((doc) => ({
      ...(doc.data() as Deck),
      id: doc.id,
    }));

    return {
      decks,
      total: decks.length,
    };
  }

  async findById(deckId: string): Promise<Deck | null> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(deckId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      ...(doc.data() as Deck),
      id: doc.id,
    };
  }

  async create(input: DeckCreateInput): Promise<Deck> {
    const tags = this.generateTags(input);
    const now = Timestamp.now();

    const deckData = {
      ...input,
      tags,
      viewCount: 0,
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(input.id);

    // setを使用して新規作成または上書き
    await docRef.set(deckData);

    return {
      ...deckData,
      id: input.id,
    };
  }

  async update(deckId: string, input: DeckUpdateInput): Promise<Deck> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(deckId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundError('デッキが見つかりません');
    }

    const tags = this.generateTags(input);
    const updateData: Record<string, unknown> = {
      ...input,
      tags,
      updatedAt: Timestamp.now(),
    };

    // setを使用してマージ更新（既存データを保持しつつ更新）
    await docRef.set(updateData, { merge: true });

    const updatedDoc = await docRef.get();
    return {
      ...(updatedDoc.data() as Deck),
      id: updatedDoc.id,
    };
  }

  async delete(deckId: string): Promise<void> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(deckId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundError('デッキが見つかりません');
    }

    await docRef.delete();
  }

  async incrementViewCount(deckId: string): Promise<void> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(deckId);

    await docRef.update({
      viewCount: FieldValue.increment(1),
    });
  }
}
