import { Timestamp } from 'firebase-admin/firestore';

import type {
  DeckComment,
  DeckPublicationRequest,
  DeckReport,
  GetDecksParams,
  GetLikedDecksParams,
  PageInfo,
  PopularHashtag,
  PublishedDeck,
} from '@/domain/entities/Deck';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/AppError';
import type { IDeckRepository } from '@/domain/repositories/IDeckRepository';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { DeckImageStorage } from '@/infrastructure/storage/DeckImageStorage';
import type { NotificationService } from './NotificationService';

export class DeckService {
  constructor(
    private deckRepository: IDeckRepository,
    private userRepository: IUserRepository,
    private deckImageStorage: DeckImageStorage,
    private notificationService: NotificationService
  ) {}

  /**
   * デッキを公開
   */
  async publishDeck(
    request: DeckPublicationRequest,
    userId: string
  ): Promise<PublishedDeck> {
    const now = Timestamp.now();

    // ユーザー情報取得
    const user = await this.userRepository.findByUid(userId);
    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    // 公開IDの重複チェック
    const existingDeck = await this.deckRepository.findPublishedDeckById(
      request.id
    );
    if (existingDeck) {
      throw new ConflictError('指定された公開IDは既に使用されています');
    }

    // 画像URLをtmpから永続ディレクトリに移動
    let movedImageUrls: string[] | undefined;
    let movedThumbnail: string | undefined;
    try {
      if (request.imageUrls && request.imageUrls.length > 0) {
        movedImageUrls = await this.deckImageStorage.moveFromTmpToDeckImages(
          request.imageUrls,
          request.id
        );
      }

      if (request.thumbnail) {
        movedThumbnail = await this.deckImageStorage.moveThumbnailFromTmp(
          request.thumbnail,
          request.id
        );
      }
    } catch (error) {
      // どちらかの移動に失敗したらロールバック
      if (movedThumbnail) {
        await this.deckImageStorage
          .deleteThumbnail(movedThumbnail)
          .catch(console.error);
      }
      if (movedImageUrls && movedImageUrls.length > 0) {
        await this.deckImageStorage
          .deleteDeckImages(movedImageUrls)
          .catch(console.error);
      }
      throw error;
    }

    // 公開デッキデータを作成
    const publishedDeckData: PublishedDeck = {
      id: request.id,
      deck: request.deck,
      userId,
      userName: user.displayName,
      comment: request.comment,
      hashtags: request.hashtags || [],
      imageUrls: movedImageUrls,
      thumbnail: movedThumbnail,
      isUnlisted: request.isUnlisted ?? false,
      viewCount: 0,
      likeCount: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // 保存
    return await this.deckRepository.saveDeck(publishedDeckData);
  }

  /**
   * デッキ一覧を取得
   */
  async getPublishedDecks(
    params: GetDecksParams,
    currentUserId: string
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    return await this.deckRepository.findPublishedDecks(params, currentUserId);
  }

  /**
   * 自分が投稿したデッキ一覧を取得
   */
  async getMyPublishedDecks(
    params: GetDecksParams,
    currentUserId: string
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    const { userId: _ignored, ...rest } = params;

    return await this.deckRepository.findPublishedDecks(
      { ...rest, userId: currentUserId },
      currentUserId,
      { includeUnlisted: true }
    );
  }

  /**
   * 自分がいいねしたデッキ一覧を取得
   */
  async getLikedDecks(
    params: GetLikedDecksParams,
    currentUserId: string
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    return await this.deckRepository.findLikedDecksByUser(
      currentUserId,
      params
    );
  }

  /**
   * デッキ詳細を取得
   */
  async getPublishedDeckById(
    id: string,
    currentUserId: string
  ): Promise<PublishedDeck> {
    const deck = await this.deckRepository.findPublishedDeckById(
      id,
      currentUserId
    );
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }
    return deck;
  }

  /**
   * デッキを削除
   */
  async deleteDeck(id: string, userId: string): Promise<void> {
    // デッキの存在確認
    const deck = await this.deckRepository.findPublishedDeckById(id);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    // 権限チェック
    if (deck.userId !== userId) {
      throw new ForbiddenError('このデッキを削除する権限がありません');
    }

    // デッキ画像を削除
    if (deck.imageUrls && deck.imageUrls.length > 0) {
      await this.deckImageStorage.deleteAllDeckImages(id).catch(console.error);
    }

    if (deck.thumbnail) {
      await this.deckImageStorage
        .deleteThumbnail(deck.thumbnail)
        .catch(console.error);
    }

    // デッキを論理削除
    await this.deckRepository.softDeleteDeck(id);

    // 関連データも処理（いいね/閲覧は削除、コメントは論理削除）
    await this.deckRepository.deleteDeckRelatedData(id);
  }

  /**
   * いいねを追加
   */
  async addLike(deckId: string, userId: string): Promise<number> {
    // デッキの存在確認
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    // 既にいいね済みかチェック
    const hasLiked = await this.deckRepository.hasLiked(deckId, userId);
    if (hasLiked) {
      return deck.likeCount || 0;
    }

    // いいねレコードを作成
    await this.deckRepository.createLike(deckId, userId);

    // いいね数を更新
    const newLikeCount = (deck.likeCount || 0) + 1;
    await this.deckRepository.updateDeck(deckId, {
      likeCount: newLikeCount,
      updatedAt: Timestamp.now(),
    });

    return newLikeCount;
  }

  /**
   * いいねを削除
   */
  async removeLike(deckId: string, userId: string): Promise<number> {
    // デッキの存在確認
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    // いいね済みかチェック
    const hasLiked = await this.deckRepository.hasLiked(deckId, userId);
    if (!hasLiked) {
      return deck.likeCount || 0;
    }

    // いいねレコードを削除
    await this.deckRepository.deleteLike(deckId, userId);

    // いいね数を更新
    const newLikeCount = Math.max((deck.likeCount || 0) - 1, 0);
    await this.deckRepository.updateDeck(deckId, {
      likeCount: newLikeCount,
      updatedAt: Timestamp.now(),
    });

    return newLikeCount;
  }

  /**
   * 閲覧数をカウント
   */
  async incrementViewCount(deckId: string, userId: string): Promise<number> {
    // デッキの存在確認
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    // 既に閲覧済みかチェック
    const hasViewed = await this.deckRepository.hasViewed(deckId, userId);
    if (hasViewed) {
      return deck.viewCount || 0;
    }

    // 閲覧レコードを作成
    await this.deckRepository.createView(deckId, userId);

    // 閲覧数を更新
    const newViewCount = (deck.viewCount || 0) + 1;
    await this.deckRepository.updateDeck(deckId, {
      viewCount: newViewCount,
      updatedAt: Timestamp.now(),
    });

    return newViewCount;
  }

  /**
   * コメントを追加
   */
  async addComment(
    deckId: string,
    userId: string,
    text: string
  ): Promise<DeckComment> {
    // デッキの存在確認
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    // ユーザー情報取得
    const user = await this.userRepository.findByUid(userId);
    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    // コメントを作成
    return await this.deckRepository.createComment({
      deckId,
      userId,
      userName: user.displayName,
      text,
      createdAt: Timestamp.now(),
    });
  }

  /**
   * デッキを通報
   */
  async reportDeck(
    deckId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    // デッキの存在確認
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    // 通報レポートを作成
    await this.deckRepository.createReport({
      deckId,
      reportedBy: userId,
      reason: reason as DeckReport['reason'],
      details,
      createdAt: Timestamp.now(),
    });

    await this.notificationService.notifyDeckReported({
      deckId,
      reportedBy: userId,
      reason,
      details,
    });

    const distinctReporters =
      await this.deckRepository.countDeckReportsByUsers(deckId);
    if (distinctReporters >= 5) {
      await this.deckRepository.softDeleteDeck(deckId);
      await this.deckRepository.softDeleteCommentsByDeckId(deckId);
      await this.notificationService.notifyDeckAutoHidden({
        deckId,
        distinctReports: distinctReporters,
      });
    }
  }

  /**
   * コメントを通報
   */
  async reportComment(
    deckId: string,
    commentId: string,
    userId: string,
    reason: DeckReport['reason'],
    details?: string
  ): Promise<void> {
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    const comment = await this.deckRepository.findCommentById(commentId);
    if (!comment || comment.deckId !== deckId) {
      throw new NotFoundError('指定されたコメントが見つかりません');
    }

    await this.deckRepository.createCommentReport({
      deckId,
      commentId,
      reportedBy: userId,
      reason,
      details,
      createdAt: Timestamp.now(),
    });

    await this.notificationService.notifyCommentReported({
      deckId,
      commentId,
      reportedBy: userId,
      reason,
      details,
    });

    const distinctReporters =
      await this.deckRepository.countCommentReportsByUsers(deckId, commentId);
    if (distinctReporters >= 5) {
      await this.deckRepository.softDeleteComment(commentId);
      await this.notificationService.notifyCommentAutoHidden({
        deckId,
        commentId,
        distinctReports: distinctReporters,
      });
    }
  }

  /**
   * コメントを削除（論理削除）
   */
  async deleteComment(
    deckId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    const comment = await this.deckRepository.findCommentById(commentId);
    if (!comment || comment.deckId !== deckId) {
      throw new NotFoundError('指定されたコメントが見つかりません');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('このコメントを削除する権限がありません');
    }

    await this.deckRepository.softDeleteComment(commentId);
  }

  /**
   * 人気ハッシュタグを集計して保存
   */
  async aggregatePopularHashtags(
    periodDays = 30,
    limit = 50
  ): Promise<{ hashtags: PopularHashtag[]; aggregatedAt: Timestamp }> {
    const now = Timestamp.now();
    const since = Timestamp.fromMillis(
      now.toMillis() - periodDays * 24 * 60 * 60 * 1000
    );

    const hashtags = await this.deckRepository.aggregatePopularHashtagsSince(
      since,
      limit
    );

    await this.deckRepository.savePopularHashtags(periodDays, hashtags, now);

    return { hashtags, aggregatedAt: now };
  }

  /**
   * 集計済みの人気ハッシュタグを取得
   */
  async getPopularHashtags(
    periodDays = 30
  ): Promise<{ hashtags: PopularHashtag[]; aggregatedAt: Timestamp | null }> {
    const summary = await this.deckRepository.findPopularHashtags(periodDays);

    if (!summary) {
      return { hashtags: [], aggregatedAt: null };
    }

    return {
      hashtags: summary.hashtags,
      aggregatedAt: summary.aggregatedAt,
    };
  }
}
