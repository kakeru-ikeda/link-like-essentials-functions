import type {
  User,
  UserCreateInput,
  UserUpdateInput,
} from '@/domain/entities/User';
import { ConflictError, NotFoundError } from '@/domain/errors/AppError';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { AvatarStorage } from '@/infrastructure/storage/AvatarStorage';

export class UserService {
  constructor(
    private userRepository: IUserRepository,
    private avatarStorage: AvatarStorage
  ) {}

  /**
   * 自分のプロフィールを取得
   */
  async getMyProfile(uid: string): Promise<User> {
    const user = await this.userRepository.findByUid(uid);

    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    return user;
  }

  /**
   * プロフィールを作成
   */
  async createProfile(
    uid: string,
    displayName: string,
    bio?: string,
    llid?: string,
    avatarUrl?: string
  ): Promise<User> {
    // 既存ユーザーチェック
    const existingUser = await this.userRepository.findByUid(uid);

    if (existingUser) {
      throw new ConflictError('ユーザーは既に登録されています');
    }

    const input: UserCreateInput = {
      uid,
      llid,
      displayName,
      bio,
    };

    // avatarUrlが指定されている場合、tmpから移動
    if (avatarUrl) {
      input.avatarUrl = await this.avatarStorage.moveFromTmpToUserAvatar(
        avatarUrl,
        uid
      );
    }

    return await this.userRepository.create(input);
  }

  /**
   * プロフィールを更新
   */
  async updateProfile(
    uid: string,
    displayName?: string,
    bio?: string,
    llid?: string,
    avatarUrl?: string
  ): Promise<User> {
    // 既存ユーザーの確認
    const existingUser = await this.userRepository.findByUid(uid);

    if (!existingUser) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    const input: UserUpdateInput = {};

    if (llid !== undefined) {
      input.llid = llid;
    }

    if (displayName !== undefined) {
      input.displayName = displayName;
    }

    if (bio !== undefined) {
      input.bio = bio;
    }

    // avatarUrlが指定されている場合、tmpから移動
    if (avatarUrl !== undefined) {
      // 既存のアバターがある場合は削除
      if (existingUser.avatarUrl) {
        await this.avatarStorage.deleteAvatar(existingUser.avatarUrl);
      }

      input.avatarUrl = await this.avatarStorage.moveFromTmpToUserAvatar(
        avatarUrl,
        uid
      );
    }

    return await this.userRepository.update(uid, input);
  }

  /**
   * アバター画像を削除
   */
  async deleteAvatar(uid: string): Promise<User> {
    // 既存ユーザーの確認
    const existingUser = await this.userRepository.findByUid(uid);

    if (!existingUser) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    // アバターがない場合はスキップ
    if (!existingUser.avatarUrl) {
      return existingUser;
    }

    // アバターを削除
    await this.avatarStorage.deleteAvatar(existingUser.avatarUrl);

    // ユーザー情報を更新
    return await this.userRepository.update(uid, { avatarUrl: undefined });
  }

  /**
   * ユーザーを削除
   */
  async deleteUser(uid: string): Promise<void> {
    // 既存ユーザーの確認
    const existingUser = await this.userRepository.findByUid(uid);

    if (!existingUser) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    // アバター画像を削除
    if (existingUser.avatarUrl) {
      await this.avatarStorage.deleteAvatar(existingUser.avatarUrl);
    }

    // ユーザーデータを削除
    await this.userRepository.delete(uid);
  }
}
