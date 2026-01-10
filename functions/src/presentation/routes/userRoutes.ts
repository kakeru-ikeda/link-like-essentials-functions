import { Router } from 'express';

import { AuthService } from '@/application/services/AuthService';
import { UserService } from '@/application/services/UserService';
import { UserRepository } from '@/infrastructure/firestore/repositories/UserRepository';
import { AvatarStorage } from '@/infrastructure/storage/AvatarStorage';
import { AuthController } from '@/presentation/controllers/AuthController';
import { UserController } from '@/presentation/controllers/UserController';
import { authenticate } from '@/presentation/middleware/authMiddleware';

export const createUserRouter = (): Router => {
  const router = Router();

  // 依存性注入
  const userRepository = new UserRepository();
  const avatarStorage = new AvatarStorage();
  const authService = new AuthService(userRepository);
  const userService = new UserService(userRepository, avatarStorage);
  const authController = new AuthController(authService);
  const userController = new UserController(userService);

  // ルーティング定義
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post(
    '/auth/upgrade/email',
    authenticate,
    authController.upgradeAnonymousToEmail
  );
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/users/me', authenticate, userController.getMyProfile);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/users/me', authenticate, userController.createProfile);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.put('/users/me', authenticate, userController.updateProfile);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete('/users/me/avatar', authenticate, userController.deleteAvatar);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete('/users/me', authenticate, userController.deleteUser);

  return router;
};
