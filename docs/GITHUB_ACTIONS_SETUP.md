# GitHub Actions セットアップガイド

このガイドでは、Firebase Functionsの自動デプロイに必要なGitHub Secretsの設定方法を説明します。

## 📋 CI/CD概要

このプロジェクトは既存バックエンド([link-like-essentials-backend](https://github.com/kakeru-ikeda/link-like-essentials-backend))と同様のCI/CD構成を採用しています。

### ワークフロー構成

- **`ci.yml`**: コード品質チェック (Lint, Test, Type Check)
  - トリガー: `main`/`develop`ブランチへのPush、PR作成時
  - ブランチ保護ルールと連携
  
- **`deploy.yml`**: Firebase Functionsへのデプロイ
  - トリガー: `main`ブランチへのマージ時
  - Discord通知機能付き

---

## 🔐 必要なSecrets

以下の3つのSecretsをGitHubリポジトリに設定する必要があります。

### 1. FIREBASE_SERVICE_ACCOUNT

Firebase Admin SDKのサービスアカウントキー(JSON形式)

#### 取得手順

1. [Firebase Console](https://console.firebase.google.com/)を開く
2. プロジェクトを選択
3. ⚙️ **Project Settings** → **Service accounts** タブを開く
4. **Generate new private key** ボタンをクリック
5. ダウンロードされたJSONファイルの**内容全体**をコピー

### 2. FIREBASE_PROJECT_ID

FirebaseプロジェクトのID

#### 取得手順

1. [Firebase Console](https://console.firebase.google.com/)を開く
2. プロジェクトを選択
3. ⚙️ **Project Settings** → **General** タブを開く
4. **Project ID** をコピー

### 3. DISCORD_WEBHOOK_URL

Discord通知用のWebhook URL

#### 取得手順

1. Discordサーバーの **Server Settings** を開く
2. **Integrations** → **Webhooks** を選択
3. **New Webhook** または既存のWebhookを選択
4. **Copy Webhook URL** をクリック

⚠️ **セキュリティ注意:**
- Webhook URLは秘匿情報です。他人と共有しないでください
- 誤って公開した場合は、即座に削除して再生成してください

---

## 🔧 GitHub Secretsの設定手順

### 手順

1. GitHubリポジトリのページを開く
   ```
   https://github.com/kakeru-ikeda/link-like-essentials-functions
   ```

2. **Settings** タブをクリック

3. 左サイドバーの **Secrets and variables** → **Actions** を選択

4. **New repository secret** ボタンをクリック

5. 各Secretを追加:

   **FIREBASE_SERVICE_ACCOUNT の追加:**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: FirebaseからダウンロードしたJSONファイルの内容全体を貼り付け
   - **Add secret** をクリック

   **FIREBASE_PROJECT_ID の追加:**
   - Name: `FIREBASE_PROJECT_ID`
   - Secret: プロジェクトID (例: `link-like-essentials`)
   - **Add secret** をクリック

   **DISCORD_WEBHOOK_URL の追加:**
   - Name: `DISCORD_WEBHOOK_URL`
   - Secret: Discord Webhook URLを貼り付け
   - **Add secret** をクリック

6. 3つすべて追加されたことを確認

---

## ✅ 動作確認

### CIワークフローの実行

1. 現在のブランチから `main` または `develop` ブランチへPull Requestを作成
   - **ci.yml** が自動実行されます
   - Lint ✅
   - Unit Tests ✅  
   - Type Check ✅
   - CI Success ✅

2. すべてのジョブが成功するまでマージ不可 ❌

### デプロイワークフローの実行

1. Pull Requestを `main` ブランチへマージ
   - **deploy.yml** が自動実行され、Firebase Functionsへデプロイされます
   - Discordに成功/失敗通知が送信されます

### ワークフローの確認方法

1. GitHubリポジトリの **Actions** タブを開く
2. 実行中・完了したワークフローの一覧が表示されます
3. ワークフローをクリックすると詳細ログが確認できます

---

## 🔒 ブランチ保護ルール（推奨）

GitHubリポジトリ設定で以下を設定することを推奨します:

```
Settings > Branches > Branch protection rules

✅ Require status checks to pass before merging
  - lint
  - test
  - type-check
  - ci-success

✅ Require branches to be up to date before merging
✅ Require pull request reviews before merging (1 approval)
□ Require conversation resolution before merging
```

---

## 🔍 トラブルシューティング

### CI失敗時

#### Lint失敗
```bash
# ローカルで確認
cd functions
npm run lint

# 自動修正
npm run lint:fix
npm run format

# 再コミット
git add .
git commit -m "fix: lint errors"
git push
```

#### Test失敗
```bash
# ローカルでテスト実行
cd functions
npm test

# 特定テストのみ実行
npm test -- DeckService.test.ts

# ウォッチモードで開発
npm run test:watch
```

#### Type Check (Build) 失敗
```bash
# 型エラー確認
cd functions
npm run build

# VSCodeで確認
# 問題タブで型エラーを確認
```

### デプロイが失敗する場合

**エラー: "Error: Unable to authenticate"**
- `FIREBASE_SERVICE_ACCOUNT` の内容が正しいか確認
- JSON全体がコピーされているか確認(先頭の`{`から末尾の`}`まで)

**エラー: "Project not found"**
- `FIREBASE_PROJECT_ID` が正しいか確認
- Firebase Consoleで表示されるProject IDと一致しているか確認

### Discord通知が届かない場合

- `DISCORD_WEBHOOK_URL` が正しいか確認
- Webhook URLが削除されていないか確認
- Discordサーバーの通知設定を確認

### ローカルでのCI検証

デプロイ前にローカルでCIを通過するか確認:

```bash
# functions ディレクトリで実行
cd functions

# 個別に実行
npm run lint
npm run format:check
npm run build
npm test

# 全て一括実行
npm run ci:local
```

---

## 📚 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Discord Webhooks Guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
- [既存バックエンドCI/CD](https://github.com/kakeru-ikeda/link-like-essentials-backend/blob/main/docs/CI_CD.md)
