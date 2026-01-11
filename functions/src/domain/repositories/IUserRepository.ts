import type { User, UserCreateInput, UserUpdateInput } from '../entities/User';

export interface IUserRepository {
  /**
   * UIDでユーザーを取得
   */
  findByUid(uid: string): Promise<User | null>;

  /**
   * UIDリストで複数ユーザーを取得
   */
  findByUids(uids: string[]): Promise<User[]>;

  /**
   * ユーザーを作成
   */
  create(input: UserCreateInput): Promise<User>;

  /**
   * ユーザーを更新
   */
  update(uid: string, input: UserUpdateInput): Promise<User>;

  /**
   * ユーザーを削除
   */
  delete(uid: string): Promise<void>;
}
