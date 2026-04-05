import type { NextFunction, Response } from 'express';

import type { CardFilterAiService } from '@/application/services/CardFilterAiService';
import type { AuthRequest } from '@/presentation/middleware/authMiddleware';
import { CardFilterQuerySchema } from '@/presentation/middleware/validator';

export class AiController {
  constructor(private readonly cardFilterAiService: CardFilterAiService) {}

  generateCardFilter = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = CardFilterQuerySchema.parse(req.body);
      const filter = await this.cardFilterAiService.generateCardFilter(query);
      res.status(200).json({ filter });
    } catch (error) {
      next(error);
    }
  };
}
