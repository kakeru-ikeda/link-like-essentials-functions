import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';

import { initializeFirebase } from '@/config/firebase';
import { errorHandler } from '@/presentation/middleware/errorHandler';
import { createDeckRouter } from '@/presentation/routes/deckRoutes';

// Firebase初期化
initializeFirebase();

// Express初期化
const app = express();

// CORS設定
app.use(cors({ origin: true }));

// Body parser
app.use(express.json());

// ルーティング
app.use('/', createDeckRouter());

// エラーハンドリング
app.use(errorHandler);

// Cloud Functions Export
export const deckApi = functions.region('asia-northeast1').https.onRequest(app);
