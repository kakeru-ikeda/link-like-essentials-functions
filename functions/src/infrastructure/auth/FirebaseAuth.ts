import { DecodedIdToken } from 'firebase-admin/auth';

import { getAuth } from '@/config/firebase';
import { AuthenticationError } from '@/domain/errors/AppError';

export class FirebaseAuth {
  public async verifyToken(token: string): Promise<DecodedIdToken> {
    try {
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      throw new AuthenticationError('認証トークンが無効です');
    }
  }
}
