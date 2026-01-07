import * as Sentry from '@sentry/google-cloud-serverless';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError, ValidationError } from '@/domain/errors/AppError';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Zodバリデーションエラー
  if (error instanceof ZodError) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const validationError = new ValidationError(
      'バリデーションエラー',
      error.errors
    );
    res.status(validationError.statusCode).json({
      error: {
        code: validationError.code,
        message: validationError.message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        details: validationError.details,
      },
    });
    return;
  }

  // カスタムAppError
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // その他のエラー
  // eslint-disable-next-line no-console
  console.error('Unexpected error:', error);
  Sentry.captureException(error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'サーバーエラーが発生しました',
    },
  });
};
