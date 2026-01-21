import { ThumbnailService } from '@/application/services/ThumbnailService';
import { StorageUtility } from '@/infrastructure/storage/StorageUtility';

export const createThumbnailService = (): ThumbnailService => {
  const storageUtil = new StorageUtility();
  return new ThumbnailService(storageUtil);
};
