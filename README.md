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

| メソッド | パス               | 説明                     | 認証 |
| -------- | ------------------ | ------------------------ | ---- |
| GET      | `/users/me`        | 自分のプロフィール取得   | 必須 |
| POST     | `/users/me`        | プロフィール作成         | 必須 |
| PUT      | `/users/me`        | プロフィール更新         | 必須 |
| POST     | `/users/me/avatar` | アバター画像アップロード | 必須 |
| DELETE   | `/users/me/avatar` | アバター画像削除         | 必須 |
| DELETE   | `/users/me`        | ユーザー削除             | 必須 |

#### GET /users/me - 自分のプロフィール取得

**レスポンス例:**

```json
{
  "user": {
    "uid": "...",
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
  "displayName": "string (1-50文字)",
  "bio": "string (最大500文字, 任意)"
}
```

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

#### POST /users/me/avatar - アバター画像アップロード

**リクエスト:**

- Content-Type: `multipart/form-data`
- フィールド名: `avatar`
- ファイル形式: JPEG, PNG, WebP
- 最大ファイルサイズ: 5MB

**レスポンス例:**

```json
{
  "user": {
    "uid": "...",
    "displayName": "...",
    "bio": "...",
    "avatarUrl": "https://...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### DELETE /users/me/avatar - アバター画像削除

**レスポンス例:**

```json
{
  "user": {
    "uid": "...",
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
