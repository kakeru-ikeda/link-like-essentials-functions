import type { NextFunction, Request, Response } from 'express';

import type { ThumbnailService } from '@/application/services/ThumbnailService';
import type { AuthRequest } from '@/presentation/middleware/authMiddleware';
import { GenerateThumbnailSchema } from '@/presentation/middleware/validator';

export class ThumbnailController {
  constructor(private thumbnailService: ThumbnailService) {}

  /**
   * POST /thumbnails/generate - サムネイル生成
   */
  public generateThumbnail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;
      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { deck, cards } = GenerateThumbnailSchema.parse(req.body);
      const thumbnailUrl = await this.thumbnailService.generateThumbnail(
        deck,
        cards
      );

      res.status(200).json({ thumbnailUrl });
    } catch (error) {
      next(error);
    }
  };
}
