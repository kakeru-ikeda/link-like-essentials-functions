import type { Request, Response, NextFunction } from 'express';

import type { UserService } from '@/application/services/UserService';
import type { User } from '@/domain/entities/User';
import type { AuthRequest } from '@/presentation/middleware/authMiddleware';
import {
  UserCreateSchema,
  UserUpdateSchema,
} from '@/presentation/middleware/validator';

// フロントエンド向けのUserProfile型
interface UserProfile {
  uid: string;
  llid?: string | null;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// UserエンティティをUserProfileに変換
const toUserProfile = (user: User): UserProfile => ({
  uid: user.uid,
  llid: user.llid,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt.toDate().toISOString(),
  updatedAt: user.updatedAt.toDate().toISOString(),
});

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /users/me - 自分のプロフィール取得
   */
  public getMyProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;

      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const user = await this.userService.getMyProfile(uid);

      res.status(200).json({ user: toUserProfile(user) });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/me - プロフィール作成
   */
  public createProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;

      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const validatedBody = UserCreateSchema.parse(req.body);
      const { user, created } = await this.userService.createProfile(
        uid,
        validatedBody.displayName,
        validatedBody.bio,
        validatedBody.llid,
        validatedBody.avatarUrl
      );

      res.status(created ? 201 : 200).json({ user: toUserProfile(user) });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /users/me - プロフィール更新
   */
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;

      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const validatedBody = UserUpdateSchema.parse(req.body);
      const user = await this.userService.updateProfile(
        uid,
        validatedBody.displayName,
        validatedBody.bio,
        validatedBody.llid,
        validatedBody.avatarUrl
      );

      res.status(200).json({ user: toUserProfile(user) });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /users/me/avatar - アバター画像削除
   */
  public deleteAvatar = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;

      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      const user = await this.userService.deleteAvatar(uid);

      res.status(200).json({ user: toUserProfile(user) });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /users/me - ユーザー削除
   */
  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = (req as AuthRequest).user?.uid;

      if (!uid) {
        throw new Error('認証情報が不正です');
      }

      await this.userService.deleteUser(uid);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
