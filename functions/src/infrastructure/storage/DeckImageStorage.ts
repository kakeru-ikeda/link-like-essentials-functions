import { v4 as uuidv4 } from 'uuid';

import { ValidationError } from '@/domain/errors/AppError';
import { StorageUtility } from '@/infrastructure/storage/StorageUtility';

export class DeckImageStorage {
  private storageUtil: StorageUtility;
  private readonly BUCKET_PATH = 'deck_images';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_IMAGES = 3;
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  constructor() {
    this.storageUtil = new StorageUtility();
  }

  /**
   * tmpディレクトリの画像をデッキ画像用ディレクトリに移動
   * @param tmpUrls tmpディレクトリのURL配列（最大3枚）
   * @param deckId デッキの公開ID
   * @returns 移動後の公開URL配列
   */
  async moveFromTmpToDeckImages(
    tmpUrls: string[],
    deckId: string
  ): Promise<string[]> {
    // 画像枚数チェック
    if (tmpUrls.length > this.MAX_IMAGES) {
      throw new ValidationError(
        `画像は最大${this.MAX_IMAGES}枚までアップロードできます`
      );
    }

    const publicUrls: string[] = [];

    try {
      for (let i = 0; i < tmpUrls.length; i++) {
        const tmpUrl = tmpUrls[i];

        // メタデータ取得して拡張子を決定
        const tmpFilePath = this.storageUtil.extractFilePathFromUrl(tmpUrl);
        const metadata = await this.storageUtil.getFileMetadata(tmpFilePath);
        const mimeType = metadata.contentType;

        if (!mimeType || !this.ALLOWED_MIME_TYPES.includes(mimeType)) {
          throw new ValidationError('許可されていないファイル形式です');
        }

        // 拡張子取得
        const ext = mimeType.split('/')[1];
        const filename = `${uuidv4()}.${ext}`;
        const destFilePath = `${this.BUCKET_PATH}/${deckId}/${filename}`;

        // ファイルを移動
        const publicUrl = await this.storageUtil.moveFromTmp(
          tmpUrl,
          destFilePath,
          this.ALLOWED_MIME_TYPES
        );

        publicUrls.push(publicUrl);
      }

      return publicUrls;
    } catch (error) {
      // エラー発生時は既に移動した画像を削除してロールバック
      if (publicUrls.length > 0) {
        await Promise.all(
          publicUrls.map((url) => this.storageUtil.deleteFileByUrl(url))
        ).catch(console.error);
      }

      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('デッキ画像の移動に失敗しました');
    }
  }

  /**
   * デッキ画像をアップロード（Buffer経由）
   */
  async uploadDeckImage(
    deckId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // ファイルサイズチェック
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      throw new ValidationError('ファイルサイズは5MB以下にしてください');
    }

    // MIMEタイプチェック
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError('許可されていないファイル形式です');
    }

    // 拡張子取得
    const ext = mimeType.split('/')[1];
    const filename = `${uuidv4()}.${ext}`;
    const filePath = `${this.BUCKET_PATH}/${deckId}/${filename}`;

    return await this.storageUtil.uploadFile(filePath, fileBuffer, mimeType);
  }

  /**
   * デッキ画像を削除
   */
  async deleteDeckImage(imageUrl: string): Promise<void> {
    await this.storageUtil.deleteFileByUrl(imageUrl);
  }

  /**
   * デッキの全画像を削除
   */
  async deleteAllDeckImages(deckId: string): Promise<void> {
    const folderPath = `${this.BUCKET_PATH}/${deckId}/`;
    await this.storageUtil.deleteDirectory(folderPath);
  }

  /**
   * 複数のデッキ画像を削除
   */
  async deleteDeckImages(imageUrls: string[]): Promise<void> {
    await Promise.all(
      imageUrls.map((url) => this.storageUtil.deleteFileByUrl(url))
    );
  }
}
