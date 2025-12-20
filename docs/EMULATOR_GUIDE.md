# Firebase Emulators ローカル開発ガイド

## 🚀 エミュレータの起動方法

### すべてのエミュレータを起動（Functions + Firestore）

```bash
npm run emulators
# または
npm run dev
```

### Firestore エミュレータのみを起動

```bash
npm run emulators:firestore
```

### Functions エミュレータのみを起動

```bash
npm run serve
```

## 📡 エミュレータのポート

- **Firestore**: `http://localhost:8080`
- **Functions**: `http://localhost:5001`
- **Emulator UI**: `http://localhost:4000`

## 🔧 環境変数の設定（オプション）

エミュレータは自動的に検出されますが、明示的に設定したい場合：

```bash
# .env.local.example をコピー
cp .env.local.example .env.local

# 環境変数を読み込んで起動
export FIRESTORE_EMULATOR_HOST=localhost:8080
npm run emulators
```

## 📝 使用例

### ローカル API エンドポイント

```
http://localhost:5001/link-like-essentials/asia-northeast1/deckApi
```

### curl でのテスト

```bash
# デッキ一覧取得
curl http://localhost:5001/link-like-essentials/asia-northeast1/deckApi/decks

# デッキ作成
curl -X POST http://localhost:5001/link-like-essentials/asia-northeast1/deckApi/decks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"deck": {...}}'
```

## 🎯 開発ワークフロー

1. エミュレータ起動

```bash
npm run dev
```

2. 別のターミナルでコード変更を監視

```bash
npm run build:watch
```

3. ブラウザで Emulator UI を開く

```
http://localhost:4000
```

## 🔍 トラブルシューティング

### エミュレータが起動しない

```bash
# Firebase CLIを最新に更新
npm install -g firebase-tools

# ポートが使用中の場合、プロセスを確認
lsof -i :8080
lsof -i :5001
lsof -i :4000
```

### Firestore に接続できない

- Emulator UI で接続状態を確認: `http://localhost:4000`
- コンソールログで `🔧 Using Firestore Emulator: localhost:8080` が表示されることを確認
