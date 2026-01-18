import type { NextFunction, Request, Response } from 'express';

import type { DeckService } from '@/application/services/DeckService';
import type {
  DeckComment,
  PopularHashtag,
  PublishedDeckApiResponse,
} from '@/domain/entities/Deck';
import type { User } from '@/domain/entities/User';
import type { AuthRequest } from '@/presentation/middleware/authMiddleware';
import {
  DeckCommentSchema,
  DeckPublishSchema,
  DeckReportSchema,
  GetLikedDecksQuerySchema,
  GetDecksQuerySchema,
  GetMyDecksQuerySchema,
  GetCommentsQuerySchema,
} from '@/presentation/middleware/validator';

// フロントエンド向けのレスポンス型（Timestamp → ISO 8601変換済み）
interface PublishedDeckResponse {
  id: string;
  deck: PublishedDeckApiResponse['deck'];
  userId: string;
  userProfile: User;
  comment?: string;
  hashtags: string[];
  imageUrls?: string[];
  thumbnail?: string;
  isUnlisted: boolean;
  viewCount: number;
  likeCount: number;
  likedByCurrentUser?: boolean;
  publishedAt: string;
}

interface DeckCommentResponse {
  id: string;
  deckId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface PopularHashtagsResponse {
  hashtags: PopularHashtag[];
  aggregatedAt: string | null;
}

// Timestamp変換ヘルパー
const toPublishedDeckResponse = (
  deck: PublishedDeckApiResponse  
): PublishedDeckResponse => ({
  id: deck.id,
  deck: deck.deck,
  userId: deck.userId,
  userProfile: deck.userProfile,
  comment: deck.comment,
  hashtags: deck.hashtags,
  imageUrls: deck.imageUrls,
  thumbnail: deck.thumbnail,
  isUnlisted: deck.isUnlisted ?? false,
  viewCount: deck.viewCount,
  likeCount: deck.likeCount,
  likedByCurrentUser: deck.likedByCurrentUser ?? false,
  publishedAt: deck.publishedAt.toDate().toISOString(),
});

const toCommentResponse = (comment: DeckComment): DeckCommentResponse => ({
  id: comment.id,
  deckId: comment.deckId,
  userId: comment.userId,
  userName: comment.userName,
  text: comment.text,
  createdAt: comment.createdAt.toDate().toISOString(),
});

export class DeckController {
  constructor(private deckService: DeckService) {}

  /**
   * GET /decks/hashtags - 人気ハッシュタグ取得
   */
  public getPopularHashtags = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const result = await this.deckService.getPopularHashtags();

      const response: PopularHashtagsResponse = {
        hashtags: result.hashtags,
        aggregatedAt: result.aggregatedAt
          ? result.aggregatedAt.toDate().toISOString()
          : null,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /decks - デッキ一覧取得
   */
  public getDecks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const params = GetDecksQuerySchema.parse(req.query);
      const result = await this.deckService.getPublishedDecks(params, uid);

      res.status(200).json({
        publishedDecks: result.decks.map(toPublishedDeckResponse),
        pageInfo: result.pageInfo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /decks/me - 自分が投稿したデッキ一覧取得
   */
  public getMyDecks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const params = GetMyDecksQuerySchema.parse(req.query);
      const result = await this.deckService.getMyPublishedDecks(params, uid);

      res.status(200).json({
        publishedDecks: result.decks.map(toPublishedDeckResponse),
        pageInfo: result.pageInfo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /decks/me/likes - 自分がいいねしたデッキ一覧取得
   */
  public getLikedDecks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const params = GetLikedDecksQuerySchema.parse(req.query);
      const result = await this.deckService.getLikedDecks(params, uid);

      res.status(200).json({
        publishedDecks: result.decks.map(toPublishedDeckResponse),
        pageInfo: result.pageInfo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /decks/:id - デッキ詳細取得
   */
  public getDeckById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const deck = await this.deckService.getPublishedDeckById(id, uid);

      res.status(200).json({
        publishedDeck: toPublishedDeckResponse(deck),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks/publish - デッキ公開
   */
  public publishDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const validatedBody = DeckPublishSchema.parse(req.body);
      const deck = await this.deckService.publishDeck(validatedBody, uid);

      res.status(201).json({
        publishedDeck: toPublishedDeckResponse(deck),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /decks/:id - デッキ削除
   */
  public deleteDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      await this.deckService.deleteDeck(id, uid);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks/:id/like - いいね追加
   */
  public addLike = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const likeCount = await this.deckService.addLike(id, uid);

      res.status(200).json({ likeCount });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /decks/:id/like - いいね削除
   */
  public removeLike = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const likeCount = await this.deckService.removeLike(id, uid);

      res.status(200).json({ likeCount });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks/:id/view - 閲覧数カウント
   */
  public incrementViewCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const viewCount = await this.deckService.incrementViewCount(id, uid);

      res.status(200).json({ viewCount });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks/:id/comments - コメント追加
   */
  public addComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const validatedBody = DeckCommentSchema.parse(req.body);
      const comment = await this.deckService.addComment(
        id,
        uid,
        validatedBody.text
      );

      res.status(201).json({
        comment: toCommentResponse(comment),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /decks/:id/comments - コメント一覧取得
   */
  public getComments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const params = GetCommentsQuerySchema.parse(req.query);
      const { comments, pageInfo } = await this.deckService.getComments(
        id,
        params
      );

      res.status(200).json({
        comments: comments.map(toCommentResponse),
        pageInfo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /decks/:id/comments/:commentId - コメント削除（論理削除）
   */
  public deleteComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id, commentId } = req.params;
      await this.deckService.deleteComment(id, commentId, uid);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks/:id/report - 通報
   */
  public reportDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id } = req.params;
      const validatedBody = DeckReportSchema.parse(req.body);
      await this.deckService.reportDeck(
        id,
        uid,
        validatedBody.reason,
        validatedBody.details
      );

      res.status(200).json({
        success: true,
        message: '通報を受け付けました',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks/:id/comments/:commentId/report - コメント通報
   */
  public reportComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { id, commentId } = req.params;
      const validatedBody = DeckReportSchema.parse(req.body);
      await this.deckService.reportComment(
        id,
        commentId,
        uid,
        validatedBody.reason,
        validatedBody.details
      );

      res.status(200).json({
        success: true,
        message: 'コメントの通報を受け付けました',
      });
    } catch (error) {
      next(error);
    }
  };
}
