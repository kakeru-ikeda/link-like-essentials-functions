import type { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '@/domain/errors/AppError';
import { FirebaseAuth } from '@/infrastructure/auth/FirebaseAuth';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // エミュレータ環境では認証をバイパスしてダミーユーザーをセット
    if (process.env['FUNCTIONS_EMULATOR'] === 'true') {
      (req as AuthRequest).user = { uid: 'emulator-user' };
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('認証トークンが必要です');
    }

    const token = authHeader.split(' ')[1];
    const auth = new FirebaseAuth();
    const decodedToken = await auth.verifyToken(token);

    (req as AuthRequest).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};
