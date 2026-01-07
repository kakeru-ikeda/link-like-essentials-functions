import * as Sentry from '@sentry/google-cloud-serverless';
import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';

import { initializeFirebase } from '@/config/firebase';
import { errorHandler } from '@/presentation/middleware/errorHandler';
import { createDeckService } from '@/presentation/factories/deckServiceFactory';
import { createDeckRouter } from '@/presentation/routes/deckRoutes';
import { createUserRouter } from '@/presentation/routes/userRoutes';
import { StorageUtility } from '@/infrastructure/storage/StorageUtility';

const sentryDsn = process.env.SENTRY_DSN;

if (!sentryDsn) {
  // eslint-disable-next-line no-console
  console.warn(
    'Warning: SENTRY_DSN is not set. Sentry will not be initialized.'
  );
} else {
  // eslint-disable-next-line no-console
  console.log('Sentry DSN is configured');
}

Sentry.init({
  dsn: sentryDsn,
  sendDefaultPii: true,
});

// Firebase初期化
initializeFirebase();

// Express初期化（userApi）
const userApp = express();
userApp.use(cors({ origin: true }));
userApp.use(express.json());
userApp.use('/', createUserRouter());
userApp.use(errorHandler);

// Express初期化（deckApi）
const deckApp = express();
deckApp.use(cors({ origin: true }));
deckApp.use(express.json());
deckApp.use('/', createDeckRouter());
deckApp.use(errorHandler);

// Cloud Functions Export
export const userApi = functions
  .region('asia-northeast1')
  .https.onRequest(Sentry.wrapHttpFunction(userApp));
export const deckApi = functions
  .region('asia-northeast1')
  .https.onRequest(Sentry.wrapHttpFunction(deckApp));

// 人気ハッシュタグ集計ジョブ（毎日0時・12時 JST）
export const aggregatePopularHashtags = functions
  .region('asia-northeast1')
  .pubsub.schedule('0 0,12 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    try {
      const deckService = createDeckService();
      await deckService.aggregatePopularHashtags();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });

// tmpディレクトリの古いファイル削除ジョブ（毎日3時 JST）
export const cleanupOldTmpFiles = functions
  .region('asia-northeast1')
  .pubsub.schedule('0 3 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    try {
      const storageUtility = new StorageUtility();
      await storageUtility.cleanupOldTmpFiles();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
