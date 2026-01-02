import { randomUUID } from 'crypto';

import { ValidationError } from '@/domain/errors/AppError';
import { StorageUtility } from '@/infrastructure/storage/StorageUtility';

export class AvatarStorage {
  private storageUtil: StorageUtility;
  private readonly BUCKET_PATH = 'avatars';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  constructor() {
    this.storageUtil = new StorageUtility();
  }

  /**
   * tmpディレクトリの画像を永続的なディレクトリに移動
   * 注: tmpUrl は事前にバリデーション済みであることを前提とする
   */
  async moveFromTmpToUserAvatar(tmpUrl: string, uid: string): Promise<string> {
    try {
      // メタデータ取得して拡張子を決定
      const tmpFilePath = this.storageUtil.extractFilePathFromUrl(tmpUrl);
      const metadata = await this.storageUtil.getFileMetadata(tmpFilePath);
      const mimeType = metadata.contentType;

      if (!mimeType || !this.ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new ValidationError('許可されていないファイル形式です');
      }

      // 拡張子取得
      const ext = mimeType.split('/')[1];
      const destFilePath = `${this.BUCKET_PATH}/${uid}/avatar.${ext}`;

      // 既存のアバターを削除（拡張子が異なる可能性があるため全削除）
      await this.deleteAllUserAvatars(uid);

      // ファイルを移動
      return await this.storageUtil.moveFromTmp(
        tmpUrl,
        destFilePath,
        this.ALLOWED_MIME_TYPES
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('アバター画像の移動に失敗しました');
    }
  }

  /**
   * アバター画像をアップロード
   */
  async uploadAvatar(
    uid: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // ファイルサイズチェック
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      throw new Error('ファイルサイズは5MB以下にしてください');
    }

    // MIMEタイプチェック
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error('許可されていないファイル形式です');
    }

    // 拡張子取得
    const ext = mimeType.split('/')[1];
    const filename = `${randomUUID()}.${ext}`;
    const filePath = `${this.BUCKET_PATH}/${uid}/${filename}`;

    return await this.storageUtil.uploadFile(filePath, fileBuffer, mimeType);
  }

  /**
   * アバター画像を削除
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    await this.storageUtil.deleteFileByUrl(avatarUrl);
  }

  /**
   * ユーザーの全アバター画像を削除
   */
  async deleteAllUserAvatars(uid: string): Promise<void> {
    const folderPath = `${this.BUCKET_PATH}/${uid}/`;
    await this.storageUtil.deleteDirectory(folderPath);
  }
}
