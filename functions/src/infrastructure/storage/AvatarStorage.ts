import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export class AvatarStorage {
  private bucket: admin.storage.Storage;
  private readonly BUCKET_PATH = 'avatars';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  constructor() {
    this.bucket = admin.storage();
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
    const filename = `${uuidv4()}.${ext}`;
    const filePath = `${this.BUCKET_PATH}/${uid}/${filename}`;

    // Firebase Storageにアップロード
    const file = this.bucket.bucket().file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // 公開URLを取得
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${this.bucket.bucket().name}/${filePath}`;

    return publicUrl;
  }

  /**
   * アバター画像を削除
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // URLからファイルパスを抽出
      const bucketName = this.bucket.bucket().name;
      const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;

      if (!avatarUrl.startsWith(urlPrefix)) {
        throw new Error('無効なアバターURLです');
      }

      const filePath = avatarUrl.replace(urlPrefix, '');
      const file = this.bucket.bucket().file(filePath);

      await file.delete();
    } catch (error) {
      // ファイルが存在しない場合はスキップ
      if ((error as { code?: number }).code === 404) {
        return;
      }
      throw error;
    }
  }

  /**
   * ユーザーの全アバター画像を削除
   */
  async deleteAllUserAvatars(uid: string): Promise<void> {
    const folderPath = `${this.BUCKET_PATH}/${uid}/`;

    try {
      const [files] = await this.bucket.bucket().getFiles({
        prefix: folderPath,
      });

      await Promise.all(files.map((file) => file.delete()));
    } catch (error) {
      // フォルダが存在しない場合はスキップ
      console.error('Failed to delete user avatars:', error);
    }
  }
}
