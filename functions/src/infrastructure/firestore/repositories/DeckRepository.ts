import { Timestamp } from 'firebase-admin/firestore';

import type {
  DeckComment,
  DeckReport,
  GetDecksParams,
  PageInfo,
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

  private firestoreClient: FirestoreClient;

  constructor() {
    this.firestoreClient = new FirestoreClient();
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
    params: GetDecksParams
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    const page = params.page || 1;
    const perPage = Math.min(params.perPage || 20, 100);
    const orderBy = params.orderBy || 'publishedAt';
    const order = params.order || 'desc';

    let query: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query =
      this.firestoreClient.collection(this.PUBLISHED_DECKS_COLLECTION);

    // フィルタ条件を適用
    if (params.userId) {
      query = query.where('userId', '==', params.userId);
    }

    if (params.songId) {
      query = query.where('deck.songId', '==', params.songId);
    }

    if (params.tag) {
      query = query.where('hashtags', 'array-contains', params.tag);
    }

    // ソート
    query = query.orderBy(orderBy, order);

    // 総件数を取得（キーワード検索がない場合）
    let totalCount = 0;
    if (!params.keyword) {
      const countSnapshot = await query.count().get();
      totalCount = countSnapshot.data().count;
    }

    // ページネーション
    const offset = (page - 1) * perPage;
    query = query.offset(offset).limit(perPage);

    const snapshot = await query.get();
    let decks = snapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
          id: doc.id,
        }) as PublishedDeck
    );

    // キーワード検索（クライアント側フィルタリング）
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      decks = decks.filter(
        (deck) =>
          deck.deck.name.toLowerCase().includes(keyword) ||
          deck.comment?.toLowerCase().includes(keyword) ||
          deck.hashtags.some((tag) => tag.toLowerCase().includes(keyword))
      );
      totalCount = decks.length;
    }

    // ページネーション情報
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
  async findPublishedDeckById(id: string): Promise<PublishedDeck | null> {
    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      ...(doc.data() as PublishedDeck),
      id: doc.id,
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
}
