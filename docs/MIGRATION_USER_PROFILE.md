# published_decks データ移行ガイド

## 概要

既存の `published_decks` コレクションのデータ構造を更新するための移行スクリプトです。

### 変更内容

- **削除**: `userName` フィールド (文字列)
- **追加**: `userProfile` フィールド (完全な User オブジェクト)

### 変更理由

- デッキ表示時にユーザーのアバター画像や自己紹介などの情報が必要になったため
- ユーザー情報が更新された際に、公開済みデッキにも反映されるようにするため
- データ整合性を保ち、追加のクエリを削減するため

## 前提条件

- Firebase Admin SDK の認証情報が設定されていること
- `published_decks` と `users` コレクションへのアクセス権限があること
- Node.js 20 以上がインストールされていること

## 実行前の準備

### 1. バックアップの作成

**必須**: 移行を実行する前に、Firestore のバックアップを作成してください。

```bash
# gcloud CLI を使用した自動バックアップ
gcloud firestore export gs://[YOUR_BUCKET_NAME]/backups/$(date +%Y%m%d_%H%M%S)

# または Firebase コンソールからエクスポート
# https://console.firebase.google.com/project/[YOUR_PROJECT]/firestore/data
```

### 2. 環境変数の設定

実行環境に応じて、Firebase プロジェクトの認証情報を設定してください。

#### 本番環境の場合

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

#### Firestore エミュレータの場合

```bash
# エミュレータを起動
cd functions
npm run emulators:firestore

# 別のターミナルで環境変数を設定
export FIRESTORE_EMULATOR_HOST="localhost:8080"
```

## 実行方法

### 本番環境での実行

```bash
cd functions

# ビルドと移行の実行
npm run migrate:user-profile
```

### エミュレータでのテスト実行

```bash
# ターミナル1: エミュレータを起動
cd functions
npm run emulators:firestore

# ターミナル2: 環境変数を設定して実行
export FIRESTORE_EMULATOR_HOST="localhost:8080"
cd functions
npm run migrate:user-profile
```

## 移行スクリプトの処理内容

1. すべての `published_decks` ドキュメントを取得
2. 各ドキュメントに対して以下を実行:
   - すでに `userProfile` が存在する場合はスキップ
   - `userId` フィールドを使用して対応する User 情報を取得
   - `userName` フィールドを削除
   - `userProfile` オブジェクトを追加
3. バッチ処理で Firestore に書き込み (500件ごと)
4. 処理結果のサマリーを出力

## 実行結果の確認

スクリプト実行後、以下のような出力が表示されます:

```
=== published_decks データ移行スクリプト開始 ===
userName フィールドを削除し、userProfile オブジェクトを追加します。

published_decks コレクションのドキュメントを取得中...
対象ドキュメント数: 150

[OK] deck_001: userName を削除し、userProfile を追加 (ユーザー: John Doe)
[OK] deck_002: userName を削除し、userProfile を追加 (ユーザー: Jane Smith)
...

=== 移行完了 ===
総ドキュメント数: 150
成功: 148
スキップ: 2
エラー: 0

移行スクリプトが正常に終了しました。

done
```

## エラー対応

### ユーザーが見つからない場合

```
[ERROR] deck_xxx: ユーザー user_123 が見つかりません
```

**対応**: 該当のユーザーが `users` コレクションに存在するか確認してください。削除されたユーザーの場合、手動で対応が必要です。

### userId が存在しない場合

```
[ERROR] deck_xxx: userId が存在しません
```

**対応**: データの整合性に問題があります。該当のドキュメントを手動で確認し、修正または削除してください。

## ロールバック

移行に問題があった場合、以下の手順でロールバックできます:

### バックアップからの復元

```bash
# gcloud CLI を使用した復元
gcloud firestore import gs://[YOUR_BUCKET_NAME]/backups/[BACKUP_TIMESTAMP]
```

### 手動でのロールバック

特定のドキュメントのみロールバックする場合:

1. Firebase コンソールで該当のドキュメントを開く
2. `userProfile` フィールドを削除
3. `userName` フィールドを追加 (元の値を設定)

## デプロイ手順

移行が正常に完了したことを確認した後、新しいコードをデプロイします:

```bash
# コードの変更をデプロイ
cd functions
npm run deploy
```

## 注意事項

- **本番環境での実行は慎重に**: 必ずバックアップを取得してから実行してください
- **エミュレータでテスト**: 本番実行前に、エミュレータ環境でテストすることを強く推奨します
- **実行タイミング**: サービスの利用が少ない時間帯に実行することを推奨します
- **再実行**: スクリプトは冪等性があり、複数回実行しても安全です (すでに移行済みのドキュメントはスキップされます)

## トラブルシューティング

### タイムアウトエラー

大量のドキュメントがある場合、タイムアウトが発生する可能性があります。その場合は、スクリプトのバッチサイズを調整するか、複数回に分けて実行してください。

### 権限エラー

Firebase Admin SDK の認証情報に適切な権限があることを確認してください。

```bash
# サービスアカウントの権限を確認
# Cloud Firestore Database Admin ロールが必要
```

## 関連ファイル

- スクリプト: [functions/src/scripts/migratePublishedDecksUserProfile.ts](../functions/src/scripts/migratePublishedDecksUserProfile.ts)
- Deck エンティティ: [functions/src/domain/entities/Deck.ts](../functions/src/domain/entities/Deck.ts)
- User エンティティ: [functions/src/domain/entities/User.ts](../functions/src/domain/entities/User.ts)

## サポート

問題が発生した場合は、以下の情報を含めて報告してください:

- エラーメッセージ
- 実行環境 (本番 / エミュレータ)
- 対象ドキュメント数
- 失敗したドキュメントの ID
