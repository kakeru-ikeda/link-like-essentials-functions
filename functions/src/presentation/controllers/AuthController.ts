import type { NextFunction, Request, Response } from 'express';

import type { AuthService } from '@/application/services/AuthService';
import { toUserProfile } from '@/presentation/controllers/UserController';
import type { AuthRequest } from '@/presentation/middleware/authMiddleware';
import { AuthUpgradeEmailSchema } from '@/presentation/middleware/validator';

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/upgrade/email - 匿名ユーザーをメールユーザーに昇格
   */
  public upgradeAnonymousToEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;

      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const { email, password, displayName } = AuthUpgradeEmailSchema.parse(
        req.body
      );

      const { user, verificationLink } =
        await this.authService.upgradeAnonymousToEmail(
          uid,
          email,
          password,
          displayName
        );

      const responseBody: Record<string, unknown> = {
        user: toUserProfile(user),
      };

      if (verificationLink) {
        responseBody.verificationLink = verificationLink;
      }

      res.status(200).json(responseBody);
    } catch (error) {
      next(error);
    }
  };
}
