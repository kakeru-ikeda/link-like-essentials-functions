import type { Timestamp } from 'firebase-admin/firestore';

export interface User {
  uid: string; // Firebase Auth UID (匿名ログイン)
  llid?: string | null; // Link Like ID (9桁の文字列)
  displayName: string; // 表示名
  bio?: string | null; // 自己紹介
  avatarUrl?: string | null; // アバター画像URL (Firebase Storage)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserCreateInput {
  uid: string;
  llid?: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserUpdateInput {
  llid?: string | null;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}
