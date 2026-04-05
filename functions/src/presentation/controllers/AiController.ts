import type { NextFunction, Response } from 'express';

import type { AiFeedbackService } from '@/application/services/AiFeedbackService';
import type { CardFilterAiService } from '@/application/services/CardFilterAiService';
import { AuthenticationError } from '@/domain/errors/AppError';
import type { AuthRequest } from '@/presentation/middleware/authMiddleware';
import {
  AiFeedbackSchema,
  CardFilterQuerySchema,
} from '@/presentation/middleware/validator';

export class AiController {
  constructor(
    private readonly cardFilterAiService: CardFilterAiService,
    private readonly aiFeedbackService: AiFeedbackService
  ) {}

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

  submitFeedback = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = req.user?.uid;
      if (!uid) throw new AuthenticationError();
      const body = AiFeedbackSchema.parse(req.body);
      const feedback = await this.aiFeedbackService.submitFeedback({
        uid,
        ...body,
      });
      res.status(201).json({ feedbackId: feedback.id });
    } catch (error) {
      next(error);
    }
  };
}
