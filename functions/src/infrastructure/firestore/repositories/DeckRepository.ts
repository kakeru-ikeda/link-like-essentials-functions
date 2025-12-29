import { Timestamp } from 'firebase-admin/firestore';

import type {
  DeckComment,
  DeckPublicationRequest,
  DeckReport,
  GetDecksParams,
  PageInfo,
  PublishedDeck,
} from '@/domain/entities/Deck';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/AppError';
import type { IDeckRepository } from '@/domain/repositories/IDeckRepository';
import { FirestoreClient } from '@/infrastructure/firestore/FirestoreClient';
import { DeckImageStorage } from '@/infrastructure/storage/DeckImageStorage';

export class DeckRepository implements IDeckRepository {
  private readonly PUBLISHED_DECKS_COLLECTION = 'published_decks';
  private readonly DECK_LIKES_COLLECTION = 'deck_likes';
  private readonly DECK_VIEWS_COLLECTION = 'deck_views';
  private readonly DECK_COMMENTS_COLLECTION = 'deck_comments';
  private readonly DECK_REPORTS_COLLECTION = 'deck_reports';

  private firestoreClient: FirestoreClient;
  private deckImageStorage: DeckImageStorage;

  constructor() {
    this.firestoreClient = new FirestoreClient();
    this.deckImageStorage = new DeckImageStorage();
  }

  /**
   * デッキを公開
   */
  async publishDeck(
    request: DeckPublicationRequest,
    userId: string,
    userName: string
  ): Promise<PublishedDeck> {
    const now = Timestamp.now();

    // 公開IDの重複チェック
    const existingDeck = await this.findPublishedDeckById(request.id);
    if (existingDeck) {
      throw new ConflictError('指定された公開IDは既に使用されています');
    }

    // 画像URLをtmpから永続ディレクトリに移動
    let movedImageUrls: string[] | undefined;
    if (request.imageUrls && request.imageUrls.length > 0) {
      movedImageUrls = await this.deckImageStorage.moveFromTmpToDeckImages(
        request.imageUrls,
        request.id
      );
    }

    const publishedDeckData: PublishedDeck = {
      id: request.id,
      deck: request.deck,
      userId,
      userName,
      comment: request.comment,
      hashtags: request.hashtags || [],
      imageUrls: movedImageUrls,
      viewCount: 0,
      likeCount: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(request.id);

    await docRef.set(publishedDeckData);

    return publishedDeckData;
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
   * 公開デッキを削除
   */
  async deleteDeck(id: string, userId: string): Promise<void> {
    const deck = await this.findPublishedDeckById(id);

    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    if (deck.userId !== userId) {
      throw new ForbiddenError('このデッキを削除する権限がありません');
    }

    // デッキ画像を削除
    if (deck.imageUrls && deck.imageUrls.length > 0) {
      await this.deckImageStorage.deleteAllDeckImages(id).catch(console.error);
    }

    const docRef = this.firestoreClient
      .collection(this.PUBLISHED_DECKS_COLLECTION)
      .doc(id);

    await docRef.delete();

    // 関連データも削除（いいね、閲覧、コメント）
    await this.deleteDeckRelatedData(id);
  }

  /**
   * 関連データを削除
   */
  private async deleteDeckRelatedData(deckId: string): Promise<void> {
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
   * いいねを追加
   */
  async addLike(deckId: string, userId: string): Promise<number> {
    const now = Timestamp.now();

    // トランザクションでいいねを追加
    return await this.firestoreClient.runTransaction(async (transaction) => {
      const deckRef = this.firestoreClient
        .collection(this.PUBLISHED_DECKS_COLLECTION)
        .doc(deckId);

      const deckDoc = await transaction.get(deckRef);

      if (!deckDoc.exists) {
        throw new NotFoundError('指定されたデッキが見つかりません');
      }

      // 決定的なドキュメントIDを使用していいね済みかチェック
      const likeId = `${deckId}_${userId}`;
      const likeRef = this.firestoreClient
        .collection(this.DECK_LIKES_COLLECTION)
        .doc(likeId);

      const likeDoc = await transaction.get(likeRef);

      // 既にいいね済みの場合は現在のカウントを返す
      if (likeDoc.exists) {
        return (deckDoc.data() as PublishedDeck).likeCount || 0;
      }

      const currentLikeCount = (deckDoc.data() as PublishedDeck).likeCount || 0;
      const newLikeCount = currentLikeCount + 1;

      // いいねレコードを作成
      transaction.set(likeRef, {
        deckId,
        userId,
        createdAt: now,
      });

      // デッキのいいね数を更新
      transaction.update(deckRef, {
        likeCount: newLikeCount,
        updatedAt: now,
      });

      return newLikeCount;
    });
  }

  /**
   * いいねを削除
   */
  async removeLike(deckId: string, userId: string): Promise<number> {
    const now = Timestamp.now();

    // トランザクションでいいねを削除
    return await this.firestoreClient.runTransaction(async (transaction) => {
      const deckRef = this.firestoreClient
        .collection(this.PUBLISHED_DECKS_COLLECTION)
        .doc(deckId);

      const deckDoc = await transaction.get(deckRef);

      if (!deckDoc.exists) {
        throw new NotFoundError('指定されたデッキが見つかりません');
      }

      // 決定的なドキュメントIDを使用していいね済みかチェック
      const likeId = `${deckId}_${userId}`;
      const likeRef = this.firestoreClient
        .collection(this.DECK_LIKES_COLLECTION)
        .doc(likeId);

      const likeDoc = await transaction.get(likeRef);

      // いいねしていない場合は現在のカウントを返す
      if (!likeDoc.exists) {
        return (deckDoc.data() as PublishedDeck).likeCount || 0;
      }

      const currentLikeCount = (deckDoc.data() as PublishedDeck).likeCount || 0;
      const newLikeCount = Math.max(currentLikeCount - 1, 0);

      // いいねレコードを削除
      transaction.delete(likeRef);

      // デッキのいいね数を更新
      transaction.update(deckRef, {
        likeCount: newLikeCount,
        updatedAt: now,
      });

      return newLikeCount;
    });
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
   * 閲覧数をカウント
   */
  async incrementViewCount(deckId: string, userId: string): Promise<number> {
    // 既に閲覧済みかチェック
    const viewsSnapshot = await this.firestoreClient
      .collection(this.DECK_VIEWS_COLLECTION)
      .where('deckId', '==', deckId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!viewsSnapshot.empty) {
      // 既に閲覧済みの場合は現在のカウントを返す
      const deck = await this.findPublishedDeckById(deckId);
      return deck?.viewCount || 0;
    }

    const now = Timestamp.now();

    // トランザクションで閲覧数を増やす
    return await this.firestoreClient.runTransaction(async (transaction) => {
      const deckRef = this.firestoreClient
        .collection(this.PUBLISHED_DECKS_COLLECTION)
        .doc(deckId);

      const deckDoc = await transaction.get(deckRef);

      if (!deckDoc.exists) {
        throw new NotFoundError('指定されたデッキが見つかりません');
      }

      const currentViewCount = (deckDoc.data() as PublishedDeck).viewCount || 0;
      const newViewCount = currentViewCount + 1;

      // 閲覧レコードを作成
      const viewRef = this.firestoreClient
        .collection(this.DECK_VIEWS_COLLECTION)
        .doc();

      transaction.set(viewRef, {
        deckId,
        userId,
        createdAt: now,
      });

      // デッキの閲覧数を更新
      transaction.update(deckRef, {
        viewCount: newViewCount,
        updatedAt: now,
      });

      return newViewCount;
    });
  }

  /**
   * コメントを追加
   */
  async addComment(
    deckId: string,
    userId: string,
    userName: string,
    text: string
  ): Promise<DeckComment> {
    const now = Timestamp.now();

    const commentRef = this.firestoreClient
      .collection(this.DECK_COMMENTS_COLLECTION)
      .doc();

    const comment: DeckComment = {
      id: commentRef.id,
      deckId,
      userId,
      userName,
      text,
      createdAt: now,
    };

    await commentRef.set(comment);

    return comment;
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
   * デッキを通報
   */
  async reportDeck(
    deckId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<DeckReport> {
    const now = Timestamp.now();

    const reportRef = this.firestoreClient
      .collection(this.DECK_REPORTS_COLLECTION)
      .doc();

    const report: DeckReport = {
      id: reportRef.id,
      deckId,
      reportedBy: userId,
      reason: reason as DeckReport['reason'],
      details,
      createdAt: now,
    };

    await reportRef.set(report);

    return report;
  }
}
