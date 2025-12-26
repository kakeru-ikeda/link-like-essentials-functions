import type { Timestamp } from 'firebase-admin/firestore';

export interface User {
  uid: string; // Firebase Auth UID (匿名ログイン)
  username: string; // ユーザー名
  avatarUrl: string | null; // アバター画像URL (Firebase Storage)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserCreateInput {
  uid: string;
  username: string;
}

export interface UserUpdateInput {
  username?: string;
  avatarUrl?: string | null;
}
