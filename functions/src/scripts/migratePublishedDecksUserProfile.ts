/**
 * published_decks コレクションのデータ移行スクリプト
 *
 * 既存の userName フィールドを削除し、完全な userProfile オブジェクトを追加します。
 * 実行前に必ずバックアップを取得してください。
 *
 * 実行方法:
 * 
 * 【エミュレータで実行】
 * プロジェクトルートの .env ファイルに以下を設定:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080
 *   GCLOUD_PROJECT=link-like-essentials
 * cd functions
 * npm run migrate:user-profile
 * 
 * 【本番環境で実行】
 * export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 * export FIREBASE_PROJECT_ID="your-project-id"
 * cd functions
 * npm run migrate:user-profile
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeFirebase } from '@/config/firebase';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// プロジェクトルートの .env ファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface OldPublishedDeck {
  userId: string;
  userName?: string;
  [key: string]: unknown;
}

const main = async (): Promise<void> => {
  console.log('=== published_decks データ移行スクリプト開始 ===');
  console.log('userName フィールドを削除し、userProfile オブジェクトを追加します。\n');

  // 環境チェック
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (emulatorHost) {
    console.log(`🧪 エミュレータモード: ${emulatorHost}\n`);
  } else {
    console.log('🌐 本番環境モード\n');
    
    if (!projectId && !credentialsPath) {
      console.error('❌ エラー: Firebase プロジェクトの認証情報が設定されていません。\n');
      console.error('以下のいずれかの方法で設定してください:\n');
      console.error('1. エミュレータを使用する場合:');
      console.error('   export FIRESTORE_EMULATOR_HOST="localhost:8080"\n');
      console.error('2. 本番環境を使用する場合:');
      console.error('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"');
      console.error('   export FIREBASE_PROJECT_ID="your-project-id"\n');
      console.error('詳細: https://cloud.google.com/docs/authentication/getting-started');
      process.exit(1);
    }
    
    console.log(`プロジェクトID: ${projectId || '(自動検出)'}`);
    console.log(`認証情報: ${credentialsPath || '(デフォルト認証)'}\n`);
  }

  initializeFirebase();
  const db = getFirestore();

  const publishedDecksRef = db.collection('published_decks');
  const usersRef = db.collection('users');

  // すべての published_decks ドキュメントを取得
  console.log('published_decks コレクションのドキュメントを取得中...');
  const snapshot = await publishedDecksRef.get();
  const totalDocuments = snapshot.size;

  console.log(`対象ドキュメント数: ${totalDocuments}\n`);

  if (totalDocuments === 0) {
    console.log('移行対象のドキュメントがありません。');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: Array<{ deckId: string; error: string }> = [];

  // バッチ処理の準備
  const batchSize = 500; // Firestore のバッチ書き込み制限
  let batch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    const deckId = doc.id;
    const data = doc.data() as OldPublishedDeck;

    try {
      // すでに userProfile が存在する場合はスキップ
      if (data.userProfile) {
        console.log(`[SKIP] ${deckId}: すでに userProfile が存在します`);
        skipCount++;
        continue;
      }

      // userId が存在しない場合はエラー
      if (!data.userId) {
        console.error(`[ERROR] ${deckId}: userId が存在しません`);
        errors.push({ deckId, error: 'userId が存在しません' });
        errorCount++;
        continue;
      }

      // ユーザー情報を取得
      const userDoc = await usersRef.doc(data.userId).get();

      if (!userDoc.exists) {
        console.error(`[ERROR] ${deckId}: ユーザー ${data.userId} が見つかりません`);
        errors.push({
          deckId,
          error: `ユーザー ${data.userId} が見つかりません`,
        });
        errorCount++;
        continue;
      }

      const userProfile = userDoc.data();

      // Firestore FieldValue を使用して userName フィールドを削除し、userProfile を追加
      batch.update(doc.ref, {
        userName: FieldValue.delete(),
        userProfile: userProfile,
      });

      operationCount++;
      successCount++;

      console.log(
        `[OK] ${deckId}: userName を削除し、userProfile を追加 (ユーザー: ${userProfile?.displayName || data.userId})`
      );

      // バッチサイズに到達したらコミット
      if (operationCount >= batchSize) {
        console.log(`\n${operationCount} 件の更新をコミット中...`);
        await batch.commit();
        console.log('コミット完了\n');
        batch = db.batch();
        operationCount = 0;
      }
    } catch (error) {
      console.error(`[ERROR] ${deckId}: 移行中にエラーが発生しました`, error);
      errors.push({
        deckId,
        error: error instanceof Error ? error.message : String(error),
      });
      errorCount++;
    }
  }

  // 残りのバッチをコミット
  if (operationCount > 0) {
    console.log(`\n最後の ${operationCount} 件の更新をコミット中...`);
    await batch.commit();
    console.log('コミット完了\n');
  }

  // 結果サマリー
  console.log('=== 移行完了 ===');
  console.log(`総ドキュメント数: ${totalDocuments}`);
  console.log(`成功: ${successCount}`);
  console.log(`スキップ: ${skipCount}`);
  console.log(`エラー: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n=== エラー詳細 ===');
    errors.forEach(({ deckId, error }) => {
      console.log(`- ${deckId}: ${error}`);
    });
  }

  console.log('\n移行スクリプトが正常に終了しました。');
};

main()
  .then(() => {
    console.log('\ndone');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n致命的なエラーが発生しました:', error);
    process.exit(1);
  });
