# Firebase Functions

## セットアップ

### 依存関係のインストール

```bash
cd functions
npm install
```

### 環境変数の設定

Firebase プロジェクトの設定が必要です。

### ビルド

```bash
npm run build
```

### ローカル開発

```bash
npm run serve
```

### デプロイ

```bash
npm run deploy
```

## ドキュメント

- [エミュレータ使用ガイド](docs/EMULATOR_GUIDE.md)
- [GitHub Actions セットアップ](docs/GITHUB_ACTIONS_SETUP.md)
- [データ移行ガイド (userProfile)](docs/MIGRATION_USER_PROFILE.md)
- [AI フィルタクエリ設計書](docs/AI_FILTER_QUERY_DESIGN.md)
- [API 仕様](docs/api-spec.yml)

## プロジェクト構造

```
functions/
├── src/
│   ├── presentation/          # Presentation Layer
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── dto/
│   ├── application/           # Application Layer
│   │   └── services/
│   ├── domain/                # Domain Layer
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── errors/
│   ├── infrastructure/        # Infrastructure Layer
│   │   ├── firestore/
│   │   └── auth/
│   ├── config/
│   └── index.ts
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── .prettierrc
```

## API エンドポイント

### Deck API

Base URL: `https://asia-northeast1-{project-id}.cloudfunctions.net/deckApi`

| メソッド | パス             | 説明           | 認証 |
| -------- | ---------------- | -------------- | ---- |
| GET      | `/decks`         | デッキ一覧取得 | 必須 |
| GET      | `/decks/:deckId` | デッキ詳細取得 | 必須 |
| POST     | `/decks`         | デッキ作成     | 必須 |
| PUT      | `/decks/:deckId` | デッキ更新     | 必須 |
| DELETE   | `/decks/:deckId` | デッキ削除     | 必須 |

#### GET /decks - デッキ一覧取得

**クエリパラメータ:**

| パラメータ | 型     | 必須 | 説明                                               |
| ---------- | ------ | ---- | -------------------------------------------------- |
| limit      | string | 任意 | 取得件数（数値文字列）                             |
| orderBy    | string | 任意 | ソート項目 (`createdAt`, `updatedAt`, `viewCount`) |
| order      | string | 任意 | ソート順 (`asc`, `desc`)                           |
| userId     | string | 任意 | ユーザー ID でフィルタ                             |
| songId     | string | 任意 | 楽曲 ID でフィルタ                                 |
| tag        | string | 任意 | タグでフィルタ                                     |

**レスポンス例:**

```json
{
  "decks": [...],
  "total": 100
}
```

#### GET /decks/:deckId - デッキ詳細取得

**パスパラメータ:**

| パラメータ | 型     | 必須 | 説明      |
| ---------- | ------ | ---- | --------- |
| deckId     | string | 必須 | デッキ ID |

**レスポンス例:**

```json
{
  "deck": {
    "id": "...",
    "userId": "...",
    "name": "...",
    "slots": [...],
    "aceSlotId": 0,
    "deckType": "...",
    "songId": "...",
    "memo": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### POST /decks - デッキ作成

**リクエストボディ:**

```json
{
  "deck": {
    "id": "uuid-v4",
    "userId": "string",
    "name": "string (1-100文字)",
    "slots": [
      {
        "slotId": "number (0-17)",
        "cardId": "string | null",
        "limitBreak": "number (1-14, 任意)"
      }
    ],
    "aceSlotId": "number (0-17) | null",
    "deckType": "string (任意)",
    "songId": "string (任意)",
    "memo": "string (最大1000文字, 任意)"
  }
}
```

- `slots` は必ず 18 個の要素を含む配列

**レスポンス例:**

```json
{
  "deck": {...}
}
```

#### PUT /decks/:deckId - デッキ更新

**パスパラメータ:**

| パラメータ | 型     | 必須 | 説明      |
| ---------- | ------ | ---- | --------- |
| deckId     | string | 必須 | デッキ ID |

**リクエストボディ:**

```json
{
  "deck": {
    "name": "string (1-100文字, 任意)",
    "slots": "array[18] (任意)",
    "aceSlotId": "number (0-17) | null (任意)",
    "deckType": "string (任意)",
    "songId": "string (任意)",
    "memo": "string (最大1000文字, 任意)"
  }
}
```

- すべてのフィールドは任意（更新したいフィールドのみ指定）

**レスポンス例:**

```json
{
  "deck": {...}
}
```

#### DELETE /decks/:deckId - デッキ削除

**パスパラメータ:**

| パラメータ | 型     | 必須 | 説明      |
| ---------- | ------ | ---- | --------- |
| deckId     | string | 必須 | デッキ ID |

**レスポンス:**

- ステータス: 204 No Content
- ボディ: なし

---

### User API

Base URL: `https://asia-northeast1-{project-id}.cloudfunctions.net/userApi`

| メソッド | パス               | 説明                   | 認証 |
| -------- | ------------------ | ---------------------- | ---- |
| GET      | `/users/me`        | 自分のプロフィール取得 | 必須 |
| POST     | `/users/me`        | プロフィール作成       | 必須 |
| PUT      | `/users/me`        | プロフィール更新       | 必須 |
| DELETE   | `/users/me/avatar` | アバター画像削除       | 必須 |
| DELETE   | `/users/me`        | ユーザー削除           | 必須 |

#### GET /users/me - 自分のプロフィール取得

**レスポンス例:**

```json
{
  "user": {
    "uid": "...",
    "llid": "123456789",
    "displayName": "...",
    "bio": "...",
    "avatarUrl": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### POST /users/me - プロフィール作成

**リクエストボディ:**

```json
{
  "llid": "string (9桁の文字列, 任意)",
  "displayName": "string (1-50文字)",
  "bio": "string (最大500文字, 任意)",
  "avatarUrl": "string (任意)"
}
```

- `avatarUrl` は `/tmp/` を含む Storage URL のみ受け付けます
- 正常な URL 形式: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/tmp%2F{filename}?alt=media&token={token}`
- 指定された場合、`/tmp/` から `/users/{uid}/avatar.{ext}` に移動されます

**レスポンス例:**

```json
{
  "user": {...}
}
```

#### PUT /users/me - プロフィール更新

**リクエストボディ:**

```json
{
  "llid": "string (9桁の文字列, 任意)",
  "displayName": "string (1-50文字, 任意)",
  "bio": "string (最大500文字, 任意)"
}
```

- すべてのフィールドは任意（更新したいフィールドのみ指定）

**レスポンス例:**

```json
{
  "user": {...}
}
```

#### DELETE /users/me/avatar - アバター画像削除

**レスポンス例:**

```json
{
  "user": {
    "uid": "...",
    "llid": "123456789",
    "displayName": "...",
    "bio": "...",
    "avatarUrl": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### DELETE /users/me - ユーザー削除

**レスポンス:**

- ステータス: 204 No Content
- ボディ: なし

#### User API 補足

- **認証**: Firebase Auth 匿名ログインの UID に紐付け
- **アバター画像**:
  - 最大ファイルサイズ: 5MB
  - 対応形式: JPEG, PNG, WebP
  - 保存先: Firebase Storage (`avatars/{uid}/`)

## コードルール

- TypeScript strict mode
- ESLint + Prettier
- レイヤードアーキテクチャ
- 依存性注入

---

## AI API (aiApi)

Base URL: `https://asia-northeast1-{project-id}.cloudfunctions.net/aiApi`

| メソッド | パス                     | 説明                         | 認証 |
| -------- | ------------------------ | ---------------------------- | ---- |
| POST     | `/ai/cards/filter-query` | 自然言語でカードフィルタ生成 | 必須 |

### POST /ai/cards/filter-query

自然言語クエリを受け取り、LLM が Firestore カード検索条件 (CardFilter) を JSON で生成して返します。

**リクエストボディ:**

```json
{
  "query": "花帆でリシャッフルできるSRカードは？"
}
```

**レスポンス例:**

```json
{
  "filter": {
    "memberIds": ["hanaho"],
    "rarities": ["SR"],
    "skillEffects": ["RESHUFFLE"],
    "filterMode": "AND"
  }
}
```

**エラーレスポンス:**

```json
{
  "error": "エラーメッセージ"
}
```

---

## ollama-backend (LLM エンジン)

`ollama-backend/` 配下に Cloud Run + NVIDIA L4 GPU で動作する Ollama コンテナの設定があります。

### 前提

- Google Cloud SDK (`gcloud`) がインストール済みで対象プロジェクトにログイン済み
- Artifact Registry リポジトリ `asia-northeast1-docker.pkg.dev/link-like-essentials/lles-llm` が作成済み
- Cloud Run が `asia-southeast1` (NVIDIA L4 対応リージョン) で有効

### ビルド & デプロイ

```bash
cd ollama-backend

# ビルド + デプロイ（通常）
./deploy.sh

# イメージビルドのみ（デプロイしない）
./deploy.sh --build-only

# デプロイのみ（ビルド済みイメージを使用）
./deploy.sh --deploy-only
```

### Dockerfile の主要引数 / 環境変数

| 変数名                | デフォルト値   | 説明                                                        |
| --------------------- | -------------- | ----------------------------------------------------------- |
| `OLLAMA_HOST`         | `0.0.0.0:8080` | Cloud Run はポート 8080 で待ち受ける                        |
| `OLLAMA_MODELS`       | `/models`      | モデルの重みの保存先                                        |
| `OLLAMA_DEBUG`        | `false`        | ログの詳細度                                                |
| `OLLAMA_KEEP_ALIVE`   | `-1`           | GPU メモリからモデルをアンロードしない (`-1` = 無制限)      |
| `OLLAMA_NUM_PARALLEL` | `4`            | 並列リクエスト数（Cloud Run の `--concurrency` と合わせる） |
| `MODEL`               | `gemma4:e4b`   | ビルド時にコンテナへ焼き込むモデル名                        |

モデルをビルド時にイメージへ焼き込む（起動高速化）ため、`ollama serve` 起動後にヘルスチェックポーリング（最大60秒）で準備完了を確認してから `ollama pull` を実行します。

### 再デプロイ時の注意

- モデルを変更する場合は `Dockerfile` の `ENV MODEL` を更新してから `./deploy.sh --build-only` でイメージを再ビルドし、`./deploy.sh --deploy-only` でデプロイしてください。
- `IMAGE_TAG` はデフォルト `latest` のため、同じタグで上書きされます。バージョン管理したい場合は `deploy.sh` の `IMAGE_TAG` を変更してください。
- Cloud Run のリージョンは NVIDIA L4 GPU が利用できる `asia-southeast1` を使用しています（Functions の `asia-northeast1` とはクロスリージョン通信になります）。
