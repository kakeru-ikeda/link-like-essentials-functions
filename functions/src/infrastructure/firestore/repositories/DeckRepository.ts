import { Timestamp } from 'firebase-admin/firestore';

import type {
  DeckComment,
  DeckReport,
  GetDecksParams,
  GetLikedDecksParams,
  PageInfo,
  PopularHashtag,
  PopularHashtagSummary,
  PublishedDeck,
} from '@/domain/entities/Deck';
import type { IDeckRepository } from '@/domain/repositories/IDeckRepository';
import { FirestoreClient } from '@/infrastructure/firestore/FirestoreClient';
import { sanitizeForFirestore } from '@/infrastructure/firestore/firestoreUtils';

export class DeckRepository implements IDeckRepository {
  private readonly PUBLISHED_DECKS_COLLECTION = 'published_decks';
  private readonly DECK_LIKES_COLLECTION = 'deck_likes';
  private readonly DECK_VIEWS_COLLECTION = 'deck_views';
  private readonly DECK_COMMENTS_COLLECTION = 'deck_comments';
  private readonly DECK_REPORTS_COLLECTION = 'deck_reports';
  private readonly POPULAR_HASHTAGS_COLLECTION = 'popular_hashtags';

  private firestoreClient: FirestoreClient;

  constructor() {
    this.firestoreClient = new FirestoreClient();
  }

  private normalizeHashtag(tag?: string): string | null {
    if (!tag) {
      return null;
    }

    const normalized = tag.trim();
    if (!normalized) {
      return null;
    }

    return normalized.startsWith('#') ? normalized : `#${normalized}`;
  }

  /**
   * デッキを保存（データアクセスのみ）
   */
  async saveDeck(deck: PublishedDeck): Promise<PublishedDeck> {
    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(deck.id);

    await docRef.set(sanitizeForFirestore(deck));

    return deck;
  }

  /**
   * 公開デッキ一覧を取得（ページネーション付き）
   */
  async findPublishedDecks(
    params: GetDecksParams,
    currentUserId?: string,
    options?: { includeUnlisted?: boolean }
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    const includeUnlisted = options?.includeUnlisted ?? false;
    const page = params.page || 1;
    const perPage = Math.min(params.perPage || 20, 100);
    const orderBy = params.orderBy || 'publishedAt';
    const order = params.order || 'desc';

    let baseQuery:
      | FirebaseFirestore.CollectionReference
      | FirebaseFirestore.Query = this.firestoreClient.collection(
      this.PUBLISHED_DECKS_COLLECTION
    );

    // フィルタ条件を適用
    if (params.userId) {
      baseQuery = baseQuery.where('userId', '==', params.userId);
    }

    if (params.songId) {
      baseQuery = baseQuery.where('deck.songId', '==', params.songId);
    }

    const normalizedTag = this.normalizeHashtag(params.tag);
    if (normalizedTag) {
      baseQuery = baseQuery.where('hashtags', 'array-contains', normalizedTag);
    }

    // 公開一覧に非表示を含めない場合はクエリ段階で除外する
    if (!includeUnlisted) {
      baseQuery = baseQuery.where('isUnlisted', '!=', true);
    }

    // 総件数を取得（クエリ条件に準拠）
    const countSnapshot = await baseQuery.count().get();
    const totalCountVisible = countSnapshot.data().count;

    // ソート
    let query = baseQuery;
    if (!includeUnlisted) {
      // Firestore の不等号フィルター使用時は同一フィールドで orderBy が必要
      query = query.orderBy('isUnlisted');
    }
    query = query.orderBy(orderBy, order);

    // ページネーション
    const offset = (page - 1) * perPage;
    query = query.offset(offset).limit(perPage);

    const snapshot = await query.get();
    const decks = snapshot.docs.map((doc) => {
      const data = doc.data() as PublishedDeck;
      return {
        ...data,
        id: doc.id,
        isUnlisted: data.isUnlisted ?? false,
      } as PublishedDeck;
    });

    const visibleDecks = includeUnlisted
      ? decks
      : decks.filter((deck) => deck.isUnlisted !== true);

    const decksWithLikeFlag = await this.attachLikedFlag(
      visibleDecks,
      currentUserId
    );

    // ページネーション情報
    const totalPages = Math.ceil(totalCountVisible / perPage);
    const pageInfo: PageInfo = {
      currentPage: page,
      perPage,
      totalCount: totalCountVisible,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalCountVisible > 0,
    };

    return { decks: decksWithLikeFlag, pageInfo };
  }

  /**
   * 指定ユーザーがいいねしたデッキ一覧を取得（ページネーション付き）
   */
  async findLikedDecksByUser(
    userId: string,
    params: GetLikedDecksParams
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    const page = params.page || 1;
    const perPage = Math.min(params.perPage || 20, 100);

    const baseQuery = this.firestoreClient
      .collection(this.DECK_LIKES_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    const countSnapshot = await baseQuery.count().get();
    const totalCount = countSnapshot.data().count;

    const offset = (page - 1) * perPage;
    const likesSnapshot = await baseQuery.offset(offset).limit(perPage).get();

    const likedDeckIdOrder = likesSnapshot.docs
      .map((doc) => (doc.data() as { deckId?: string }).deckId)
      .filter((deckId): deckId is string => Boolean(deckId));

    if (likedDeckIdOrder.length === 0) {
      const totalPages = Math.ceil(totalCount / perPage);
      const pageInfo: PageInfo = {
        currentPage: page,
        perPage,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { decks: [], pageInfo };
    }

    const deckDocs = await Promise.all(
      likedDeckIdOrder.map((deckId) =>
        this.firestoreClient
          .collection(this.PUBLISHED_DECKS_COLLECTION)
          .doc(deckId)
          .get()
      )
    );

    const orderMap = new Map<string, number>();
    likedDeckIdOrder.forEach((deckId, index) => orderMap.set(deckId, index));

    const decks = deckDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data() as PublishedDeck;
        return {
          ...data,
          id: doc.id,
          isUnlisted: data.isUnlisted ?? false,
          likedByCurrentUser: true,
        };
      })
      .sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? 0;
        const orderB = orderMap.get(b.id) ?? 0;
        return orderA - orderB;
      });

    const totalPages = Math.ceil(totalCount / perPage);
    const pageInfo: PageInfo = {
      currentPage: page,
      perPage,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { decks, pageInfo };
  }

  /**
   * 公開デッキを1件取得
   */
  async findPublishedDeckById(
    id: string,
    currentUserId?: string
  ): Promise<PublishedDeck | null> {
    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const likedByCurrentUser = currentUserId
      ? await this.hasLiked(id, currentUserId)
      : undefined;

    const data = doc.data() as PublishedDeck;

    return {
      ...data,
      id: doc.id,
      isUnlisted: data.isUnlisted ?? false,
      likedByCurrentUser,
    };
  }

  /**
   * 公開デッキを更新
   */
  async updateDeck(id: string, data: Partial<PublishedDeck>): Promise<void> {
    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(id);

    await docRef.update(sanitizeForFirestore(data));
  }

  /**
   * 公開デッキを削除
   */
  async deleteDeck(id: string): Promise<void> {
    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(id);

    await docRef.delete();
  }

  /**
   * デッキに関連する全データを削除（いいね、閲覧、コメント）
   */
  async deleteDeckRelatedData(deckId: string): Promise<void> {
    const batch = this.firestoreClient.batch();

    // いいねを削除
    const likesSnapshot = await this.firestoreClient
      .collection(this.DECK_LIKES_COLLECTION)
      .where('deckId', '==', deckId)
      .get();

    likesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 閲覧履歴を削除
    const viewsSnapshot = await this.firestoreClient
      .collection(this.DECK_VIEWS_COLLECTION)
      .where('deckId', '==', deckId)
      .get();

    viewsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // コメントを削除
    const commentsSnapshot = await this.firestoreClient
      .collection(this.DECK_COMMENTS_COLLECTION)
      .where('deckId', '==', deckId)
      .get();

    commentsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  /**
   * いいねレコードを作成
   */
  async createLike(deckId: string, userId: string): Promise<void> {
    const now = Timestamp.now();
    const likeId = `${deckId}_${userId}`;
    const likeRef = this.firestoreClient
      .collection(this.DECK_LIKES_COLLECTION)
      .doc(likeId);

    await likeRef.set({
      deckId,
      userId,
      createdAt: now,
    });
  }

  /**
   * いいねレコードを削除
   */
  async deleteLike(deckId: string, userId: string): Promise<void> {
    const likeId = `${deckId}_${userId}`;
    const likeRef = this.firestoreClient
      .collection(this.DECK_LIKES_COLLECTION)
      .doc(likeId);

    await likeRef.delete();
  }

  /**
   * いいねしているか確認
   */
  async hasLiked(deckId: string, userId: string): Promise<boolean> {
    const likeId = `${deckId}_${userId}`;
    const likeRef = this.firestoreClient
      .collection(this.DECK_LIKES_COLLECTION)
      .doc(likeId);

    const likeDoc = await likeRef.get();

    return likeDoc.exists;
  }

  /**
   * 閲覧レコードを作成
   */
  async createView(deckId: string, userId: string): Promise<void> {
    const now = Timestamp.now();
    const viewRef = this.firestoreClient
      .collection(this.DECK_VIEWS_COLLECTION)
      .doc();

    await viewRef.set({
      deckId,
      userId,
      createdAt: now,
    });
  }

  /**
   * 閲覧履歴が存在するか確認
   */
  async hasViewed(deckId: string, userId: string): Promise<boolean> {
    const viewsSnapshot = await this.firestoreClient
      .collection(this.DECK_VIEWS_COLLECTION)
      .where('deckId', '==', deckId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    return !viewsSnapshot.empty;
  }

  /**
   * コメントを作成
   */
  async createComment(comment: Omit<DeckComment, 'id'>): Promise<DeckComment> {
    const commentRef = this.firestoreClient
      .collection(this.DECK_COMMENTS_COLLECTION)
      .doc();

    const newComment: DeckComment = {
      ...comment,
      id: commentRef.id,
    };

    await commentRef.set(newComment);

    return newComment;
  }

  /**
   * コメント一覧を取得
   */
  async findCommentsByDeckId(deckId: string): Promise<DeckComment[]> {
    const snapshot = await this.firestoreClient
      .collection(this.DECK_COMMENTS_COLLECTION)
      .where('deckId', '==', deckId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
          id: doc.id,
        }) as DeckComment
    );
  }

  /**
   * 通報レコードを作成
   */
  async createReport(report: Omit<DeckReport, 'id'>): Promise<DeckReport> {
    const reportRef = this.firestoreClient
      .collection(this.DECK_REPORTS_COLLECTION)
      .doc();

    const newReport: DeckReport = {
      ...report,
      id: reportRef.id,
    };

    await reportRef.set(sanitizeForFirestore(newReport));

    return newReport;
  }

  private async attachLikedFlag(
    decks: PublishedDeck[],
    currentUserId?: string
  ): Promise<PublishedDeck[]> {
    if (!currentUserId || decks.length === 0) {
      return decks;
    }

    const deckIds = decks.map((deck) => deck.id);
    const likedDeckIds = new Set<string>();

    // Firestoreのin句は最大10件なのでチャンクして問い合わせる
    const chunkSize = 10;
    for (let i = 0; i < deckIds.length; i += chunkSize) {
      const chunk = deckIds.slice(i, i + chunkSize);
      const snapshot = await this.firestoreClient
        .collection(this.DECK_LIKES_COLLECTION)
        .where('userId', '==', currentUserId)
        .where('deckId', 'in', chunk)
        .get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as { deckId?: string };
        if (data.deckId) {
          likedDeckIds.add(data.deckId);
        }
      });
    }

    return decks.map((deck) => ({
      ...deck,
      likedByCurrentUser: likedDeckIds.has(deck.id),
    }));
  }

  /**
   * 指定日時以降の公開デッキから人気ハッシュタグを集計
   */
  async aggregatePopularHashtagsSince(
    since: Timestamp,
    limit: number
  ): Promise<PopularHashtag[]> {
    const snapshot = await this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .where('publishedAt', '>=', since)
      .get();

    const hashtagCounts = new Map<string, number>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as PublishedDeck;
      if (data.isUnlisted === true) {
        return;
      }
      if (!Array.isArray(data.hashtags)) {
        return;
      }

      data.hashtags.forEach((tag) => {
        if (typeof tag !== 'string') {
          return;
        }
        const normalized = tag.trim();
        if (!normalized) {
          return;
        }
        hashtagCounts.set(normalized, (hashtagCounts.get(normalized) || 0) + 1);
      });
    });

    const sorted = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([hashtag, count]) => ({ hashtag, count }));

    return sorted;
  }

  /**
   * 人気ハッシュタグの集計結果を保存
   */
  async savePopularHashtags(
    periodDays: number,
    hashtags: PopularHashtag[],
    aggregatedAt: Timestamp
  ): Promise<void> {
    const docId = `last_${periodDays}_days`;
    const docRef = this.firestoreClient
      .collection(this.POPULAR_HASHTAGS_COLLECTION)
      .doc(docId);

    await docRef.set(
      sanitizeForFirestore({
        periodDays,
        hashtags,
        aggregatedAt,
      })
    );
  }

  /**
   * 人気ハッシュタグの集計結果を取得
   */
  async findPopularHashtags(
    periodDays: number
  ): Promise<PopularHashtagSummary | null> {
    const docId = `last_${periodDays}_days`;
    const docRef = this.firestoreClient
      .collection(this.POPULAR_HASHTAGS_COLLECTION)
      .doc(docId);

    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as PopularHashtagSummary;

    return {
      ...data,
      aggregatedAt: data.aggregatedAt,
    };
  }
}
