import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';

import { initializeFirebase } from '@/config/firebase';
import { errorHandler } from '@/presentation/middleware/errorHandler';
import { createDeckService } from '@/presentation/factories/deckServiceFactory';
import { createDeckRouter } from '@/presentation/routes/deckRoutes';
import { createUserRouter } from '@/presentation/routes/userRoutes';

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
  .https.onRequest(userApp);
export const deckApi = functions
  .region('asia-northeast1')
  .https.onRequest(deckApp);

// 人気ハッシュタグ集計ジョブ（毎日0時・12時 JST）
export const aggregatePopularHashtags = functions
  .region('asia-northeast1')
  .pubsub.schedule('0 0,12 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    const deckService = createDeckService();
    await deckService.aggregatePopularHashtags();
  });
