import { Request, Response, NextFunction } from 'express';

import { DeckService } from '@/application/services/DeckService';
import { AuthRequest } from '@/presentation/middleware/authMiddleware';
import {
  DeckCreateSchema,
  DeckQuerySchema,
  DeckUpdateSchema,
} from '@/presentation/middleware/validator';

export class DeckController {
  constructor(private deckService: DeckService) {}

  /**
   * GET /decks - デッキ一覧取得
   */
  public getDecks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedQuery = DeckQuerySchema.parse(req.query);

      const params = {
        limit: validatedQuery.limit
          ? parseInt(validatedQuery.limit, 10)
          : undefined,
        orderBy: validatedQuery.orderBy,
        order: validatedQuery.order,
        userId: validatedQuery.userId,
        songId: validatedQuery.songId,
        tag: validatedQuery.tag,
      };

      const result = await this.deckService.getDecks(params);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /decks/:deckId - デッキ詳細取得
   */
  public getDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { deckId } = req.params;
      const deck = await this.deckService.getDeck(deckId);

      res.status(200).json({ deck });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /decks - デッキ作成
   */
  public createDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedBody = DeckCreateSchema.parse(req.body);
      const deck = await this.deckService.createDeck(validatedBody.deck);

      res.status(201).json({ deck });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /decks/:deckId - デッキ更新
   */
  public updateDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { deckId } = req.params;
      const userId = (req as AuthRequest).user?.uid;

      if (!userId) {
        throw new Error('認証情報が不正です');
      }

      const validatedBody = DeckUpdateSchema.parse(req.body);
      const deck = await this.deckService.updateDeck(
        deckId,
        userId,
        validatedBody.deck
      );

      res.status(200).json({ deck });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /decks/:deckId - デッキ削除
   */
  public deleteDeck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { deckId } = req.params;
      const userId = (req as AuthRequest).user?.uid;

      if (!userId) {
        throw new Error('認証情報が不正です');
      }

      await this.deckService.deleteDeck(deckId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
