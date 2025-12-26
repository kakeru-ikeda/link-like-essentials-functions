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

#### User API 詳細

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
