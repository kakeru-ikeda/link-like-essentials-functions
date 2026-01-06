import * as admin from 'firebase-admin';

import { ValidationError } from '@/domain/errors/AppError';

/**
 * Firebase Storage共通ユーティリティクラス
 */
export class StorageUtility {
  private bucket: admin.storage.Storage;

  constructor() {
    this.bucket = admin.storage();
  }

  /**
   * URLからファイルパスを抽出
   */
  extractFilePathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
      if (!pathMatch || !pathMatch[1]) {
        throw new Error('Invalid URL format');
      }
      return decodeURIComponent(pathMatch[1]);
    } catch {
      throw new ValidationError('無効なStorage URLです');
    }
  }

  /**
   * ファイルの存在確認
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const file = this.bucket.bucket().file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  /**
   * ファイルのメタデータを取得
   */
  async getFileMetadata(filePath: string): Promise<{
    contentType?: string;
    size?: number;
  }> {
    const file = this.bucket.bucket().file(filePath);
    const [metadata] = await file.getMetadata();
    return {
      contentType: metadata.contentType,
      size: metadata.size ? Number(metadata.size) : undefined,
    };
  }

  /**
   * tmpディレクトリから指定ディレクトリにファイルを移動
   */
  async moveFromTmp(
    tmpUrl: string,
    destFilePath: string,
    allowedMimeTypes?: string[]
  ): Promise<string> {
    try {
      // tmpファイルのパスを抽出
      const tmpFilePath = this.extractFilePathFromUrl(tmpUrl);
      const tmpFile = this.bucket.bucket().file(tmpFilePath);

      // ファイルの存在確認
      const [exists] = await tmpFile.exists();
      if (!exists) {
        throw new ValidationError('指定されたtmp画像が見つかりません');
      }

      // メタデータ取得
      const metadata = await this.getFileMetadata(tmpFilePath);
      const mimeType = metadata.contentType;

      // MIMEタイプチェック
      if (allowedMimeTypes && mimeType) {
        if (!allowedMimeTypes.includes(mimeType)) {
          throw new ValidationError('許可されていないファイル形式です');
        }
      }

      // ファイルを移動（コピー→削除）
      const destFile = this.bucket.bucket().file(destFilePath);
      await tmpFile.copy(destFile);
      await tmpFile.delete();

      // 公開URLを取得
      await destFile.makePublic();
      const publicUrl = `https://storage.googleapis.com/${this.bucket.bucket().name}/${destFilePath}`;

      return publicUrl;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('画像の移動に失敗しました');
    }
  }

  /**
   * ファイルをアップロード
   */
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
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
   * URLで指定されたファイルを削除
   */
  async deleteFileByUrl(fileUrl: string): Promise<void> {
    try {
      const bucketName = this.bucket.bucket().name;
      const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;

      if (!fileUrl.startsWith(urlPrefix)) {
        throw new Error('無効なファイルURLです');
      }

      const filePath = fileUrl.replace(urlPrefix, '');
      await this.deleteFile(filePath);
    } catch (error) {
      // ファイルが存在しない場合はスキップ
      if ((error as { code?: number }).code === 404) {
        return;
      }
      throw error;
    }
  }

  /**
   * パスで指定されたファイルを削除
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
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
   * 指定されたディレクトリ内の全ファイルを削除
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      const [files] = await this.bucket.bucket().getFiles({
        prefix: dirPath,
      });

      await Promise.all(files.map((file) => file.delete()));
    } catch (error) {
      // ディレクトリが存在しない場合はスキップ
      console.error('Failed to delete directory:', error);
    }
  }

  /**
   * バケット名を取得
   */
  getBucketName(): string {
    return this.bucket.bucket().name;
  }

  /**
   * tmpディレクトリ内の24時間以上経過したファイルを削除
   * @returns 削除されたファイル数
   */
  async cleanupOldTmpFiles(): Promise<number> {
    try {
      const [files] = await this.bucket.bucket().getFiles({
        prefix: 'tmp/',
      });

      const now = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000; // 24時間をミリ秒で表現
      let deletedCount = 0;

      for (const file of files) {
        try {
          const [metadata] = await file.getMetadata();
          const timeCreated = metadata.timeCreated
            ? new Date(metadata.timeCreated).getTime()
            : null;

          if (timeCreated && now - timeCreated > oneDayInMs) {
            await file.delete();
            deletedCount++;
          }
        } catch (error) {
          // 個別ファイルの削除エラーは記録のみで処理を続行
          console.error(`Failed to delete file ${file.name}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup tmp files:', error);
      throw error;
    }
  }
}
