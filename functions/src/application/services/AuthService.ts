import { getAuth } from '@/config/firebase';
import { ConflictError, NotFoundError } from '@/domain/errors/AppError';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { User } from '@/domain/entities/User';
import type { UserRecord } from 'firebase-admin/auth';

export class AuthService {
  constructor(private userRepository: IUserRepository) {}

  public async upgradeAnonymousToEmail(
    uid: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user: User; verificationLink?: string }> {
    const auth = getAuth();

    const existingUser = await this.userRepository.findByUid(uid);

    if (!existingUser) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    if (existingUser.role !== 'anonymous') {
      throw new ConflictError('既にメールユーザーです');
    }

    const existingByEmail = await this.getUserByEmail(auth, email);

    if (existingByEmail && existingByEmail.uid !== uid) {
      throw new ConflictError('このメールアドレスは既に使用されています');
    }

    let updatedProfile: User | null = null;

    try {
      updatedProfile = await this.userRepository.update(uid, {
        role: 'email',
        displayName,
      });

      await auth.updateUser(uid, {
        email,
        password,
        emailVerified: false,
      });
    } catch (error) {
      if (updatedProfile) {
        try {
          await this.userRepository.update(uid, {
            role: existingUser.role,
            displayName: existingUser.displayName,
          });
        } catch (rollbackError) {
          // eslint-disable-next-line no-console
          console.error(
            'Failed to rollback user profile after auth update failure',
            rollbackError
          );
        }
      }

      const errorCode = (error as { code?: string }).code;

      if (errorCode === 'auth/email-already-exists') {
        throw new ConflictError('このメールアドレスは既に使用されています');
      }

      throw error;
    }

    const user = updatedProfile ?? (await this.userRepository.findByUid(uid));

    let verificationLink: string | undefined;
    try {
      verificationLink = await auth.generateEmailVerificationLink(email);
    } catch (error) {
      // 検証リンク生成は任意のため、失敗しても処理継続
    }

    return { user: user as User, verificationLink };
  }

  private async getUserByEmail(
    auth: ReturnType<typeof getAuth>,
    email: string
  ): Promise<UserRecord | null> {
    try {
      return await auth.getUserByEmail(email);
    } catch (error) {
      const errorCode = (error as { code?: string }).code;

      if (errorCode === 'auth/user-not-found') {
        return null;
      }

      throw error;
    }
  }
}
