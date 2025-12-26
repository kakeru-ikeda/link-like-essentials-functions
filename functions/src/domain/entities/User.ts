import type { Timestamp } from 'firebase-admin/firestore';

export interface User {
  uid: string; // Firebase Auth UID (匿名ログイン)
  displayName: string; // 表示名
  bio?: string; // 自己紹介
  avatarUrl?: string; // アバター画像URL (Firebase Storage)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserCreateInput {
  uid: string;
  displayName: string;
  bio?: string;
}

export interface UserUpdateInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}
