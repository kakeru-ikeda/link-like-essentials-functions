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
  async createProfile(uid: string, username: string): Promise<User> {
    // 既存ユーザーチェック
    const existingUser = await this.userRepository.findByUid(uid);

    if (existingUser) {
      throw new ConflictError('ユーザーは既に登録されています');
    }

    const input: UserCreateInput = {
      uid,
      username,
    };

    return await this.userRepository.create(input);
  }

  /**
   * プロフィールを更新
   */
  async updateProfile(uid: string, username?: string): Promise<User> {
    // 既存ユーザーの確認
    const existingUser = await this.userRepository.findByUid(uid);

    if (!existingUser) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    const input: UserUpdateInput = {};

    if (username !== undefined) {
      input.username = username;
    }

    return await this.userRepository.update(uid, input);
  }

  /**
   * アバター画像をアップロード
   */
  async uploadAvatar(
    uid: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<User> {
    // 既存ユーザーの確認
    const existingUser = await this.userRepository.findByUid(uid);

    if (!existingUser) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    // 既存のアバターがある場合は削除
    if (existingUser.avatarUrl) {
      await this.avatarStorage.deleteAvatar(existingUser.avatarUrl);
    }

    // 新しいアバターをアップロード
    const avatarUrl = await this.avatarStorage.uploadAvatar(
      uid,
      fileBuffer,
      mimeType
    );

    // ユーザー情報を更新
    return await this.userRepository.update(uid, { avatarUrl });
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
    return await this.userRepository.update(uid, { avatarUrl: null });
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
