# 自然言語カードフィルタクエリ生成 AI エンドポイント 設計書

## 1. 概要

ユーザーが入力した自然言語のテキストを解析し、`CardFilter` インターフェースに準拠したフィルタパラメータを生成する AI エンドポイントを実装する。

### 入出力例

| 入力（自然言語）                         | 出力（フィルタJSON）                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 「花帆でリシャッフルできるSRカードは？」 | `{ rarities: ["SR"], characterNames: ["日野下花帆"], skillEffects: ["RESHUFFLE"], filterMode: "AND" }` |
| 「UR レアリティのチアリーダーカード」    | `{ rarities: ["UR"], styleTypes: ["CHEERLEADER"], filterMode: "AND" }`                                 |
| 「さやかかさやかの限定カードを除外して」 | `{ characterNames: ["村野さやか"], ... }`                                                              |

---

## 2. システム全体アーキテクチャ

```
[フロントエンド]
      │ POST /ai/cards/filter-query   （将来: /ai/decks/suggest, /ai/chat など）
      │ Authorization: Bearer <Firebase ID Token>
      ▼
[Firebase Functions: aiApi]          ← 既存の Firebase Functions に追加
      │ Service Account (OIDC) 認証
      │ POST /api/chat (Ollama API)
      ▼
[Cloud Run: lles-llm-engine]         ← 新規 Cloud Run サービス（用途非依存の命名）
      │ GPU: NVIDIA L4 × 1
      │ モデル: gemma4:e4b (4.5B effective)
      ▼
[Gemma 4 (Ollama)]
      │ JSON 形式で CardFilter を返却
      ▼
[Firebase Functions: aiApi]
      │ JSON をパース・バリデーション
      ▼
[フロントエンド]
```

---

## 3. AI エンジン（Cloud Run + Ollama）

### 3.1 モデル選定

| モデル           | サイズ    | 推奨利用場面                   | VRAM      |
| ---------------- | --------- | ------------------------------ | --------- |
| `gemma4:e2b`     | 7.2GB     | エッジデバイス向け             | ~8GB      |
| **`gemma4:e4b`** | **9.6GB** | **Cloud Run 推奨（本案採用）** | **~12GB** |
| `gemma4:26b`     | 18GB      | 高精度ワークステーション向け   | ~20GB     |
| `gemma4:31b`     | 20GB      | 最高精度                       | ~24GB     |

**採用理由**: `gemma4:e4b` は 4.5B effective parameters で JSON 構造化出力に十分な性能を持ち、NVIDIA L4 GPU（24GB VRAM）に収まる最適サイズ。Gemma 4 はネイティブ Function Calling と System Prompt をサポートしており、構造化出力に適している。

### 3.2 Dockerfile

```dockerfile
FROM ollama/ollama:latest

# Cloud Run はポート8080で待ち受ける
ENV OLLAMA_HOST 0.0.0.0:8080

# モデルの重みの保存先
ENV OLLAMA_MODELS /models

# ログの詳細度を下げる
ENV OLLAMA_DEBUG false

# GPUメモリからモデルをアンロードしない
ENV OLLAMA_KEEP_ALIVE -1

# 並列リクエスト数（Cloud Run の --concurrency と合わせる）
ENV OLLAMA_NUM_PARALLEL 4

# コンテナイメージにモデルの重みを焼き込む（起動高速化）
ENV MODEL gemma4:e4b
RUN ollama serve & sleep 10 && ollama pull $MODEL

ENTRYPOINT ["ollama", "serve"]
```

### 3.3 Cloud Run デプロイコマンド

```bash
# Artifact Registry リポジトリ作成（初回のみ）
gcloud artifacts repositories create lles-ai \
  --repository-format=docker \
  --location=asia-northeast1

# Cloud Run へデプロイ
# サービス名は「lles-llm-engine」とし、カードフィルタ専用にしない
gcloud run deploy lles-llm-engine \
  --source ./ollama-backend \
  --concurrency 4 \
  --cpu 8 \
  --set-env-vars OLLAMA_NUM_PARALLEL=4 \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --max-instances 1 \
  --memory 32Gi \
  --no-allow-unauthenticated \
  --no-cpu-throttling \
  --no-gpu-zonal-redundancy \
  --region asia-northeast1 \
  --timeout=600
```

### 3.4 Cloud Run 構成パラメータ

| パラメータ                   | 値              | 理由                                               |
| ---------------------------- | --------------- | -------------------------------------------------- |
| `--concurrency`              | 4               | `OLLAMA_NUM_PARALLEL` と一致させてキュー蓄積を防止 |
| `--gpu`                      | 1               | NVIDIA L4 GPU 1基                                  |
| `--gpu-type`                 | `nvidia-l4`     | 24GB VRAM / Cloud Run 対応 GPU                     |
| `--memory`                   | 32Gi            | L4 使用時の推奨最小メモリ                          |
| `--cpu`                      | 8               | L4 1基に対応した CPU 数                            |
| `--max-instances`            | 1               | GPU 割り当て上限に合わせる（要拡張時は変更）       |
| `--no-allow-unauthenticated` | -               | Firebase Function からのサービス間通信のみ許可     |
| `--timeout`                  | 600             | LLM 推論の最大応答時間                             |
| `--region`                   | asia-northeast1 | Firebase Functions と同リージョン                  |

> **注意**: GPU 割り当てリクエストが必要。`Cloud Run Admin API > 割り当てとシステムの上限 > Total Nvidia L4 GPU allocation, per project per region` でリクエスト。

---

## 4. Firebase Functions: `aiApi` エンドポイント

### 4.1 エンドポイント仕様

```
POST /cards/filter-query
Authorization: Bearer <Firebase ID Token>
Content-Type: application/json
```

**リクエストボディ**:

```json
{
  "query": "花帆でリシャッフルできるSRカードは？"
}
```

**レスポンスボディ（成功時）**:

```json
{
  "filter": {
    "rarities": ["SR"],
    "characterNames": ["日野下花帆"],
    "skillEffects": ["RESHUFFLE"],
    "filterMode": "AND"
  }
}
```

**エラー時**:

```json
{
  "error": "INVALID_QUERY",
  "message": "クエリの解析に失敗しました"
}
```

### 4.2 ファイル構成（既存のアーキテクチャに準拠）

`AiService` は用途ごとに分割し、`OllamaClient` を共有する設計にする。
将来ユースケースが増えた場合も `*AiService.ts` を追加するだけで対応できる。

```
functions/src/
├── presentation/
│   ├── controllers/
│   │   └── AiController.ts              ← 新規（/ai/* 配下を統括）
│   ├── routes/
│   │   └── aiRoutes.ts                  ← 新規（/ai/cards/filter-query 他を束ねる）
│   └── factories/
│       └── aiServiceFactory.ts          ← 新規（各 AIService の DI 組み立て）
├── application/
│   └── services/
│       └── CardFilterAiService.ts       ← 新規（カードフィルタ生成の1責務）
│         # 将来追加例:
│         # DeckSuggestAiService.ts      ← デッキ提案
│         # ChatAiService.ts             ← 汎用チャット
├── infrastructure/
│   └── ai/
│       └── OllamaClient.ts              ← 新規（LLMクライアント汎用層・用途非依存）
└── index.ts                             ← aiApi を追記

ollama-backend/
└── Dockerfile                           ← Cloud Run 用 LLM エンジン（モデル変更以外は不変）
```

### 4.3 Ollama へのプロンプト設計

#### システムプロンプト

````
You are a card filter query builder for a card game application.
Your task is to parse a Japanese natural language query and return a JSON object matching the CardFilter interface.

## CardFilter Interface

```json
{
  "keyword": "string (optional) - partial match for card name, character name, skill/trait name and effect",
  "rarities": "Rarity[] (optional) - UR | SR | R | DR | BR | LR",
  "characterNames": "string[] (optional) - character names in Japanese",
  "styleTypes": "StyleType[] (optional) - CHEERLEADER | TRICKSTER | PERFORMER | MOODMAKER",
  "limitedTypes": "LimitedType[] (optional) - PERMANENT | LIMITED | SPRING_LIMITED | SUMMER_LIMITED | AUTUMN_LIMITED | WINTER_LIMITED | BIRTHDAY_LIMITED | LEG_LIMITED | SHUFFLE_LIMITED | BATTLE_LIMITED | BANGDREAM_LIMITED | PARTY_LIMITED | ACTIVITY_LIMITED | GRADUATE_LIMITED | LOGIN_BONUS | REWARD",
  "favoriteModes": "FavoriteMode[] (optional) - NONE | HAPPY | MELLOW | NEUTRAL",
  "skillEffects": "SkillEffectType[] (optional) - dynamic string values like RESHUFFLE, HEAL, DRAW, etc.",
  "skillMainEffects": "SkillEffectType[] (optional) - same as skillEffects but matches only the primary effect",
  "skillSearchTargets": "SkillSearchTarget[] (optional) - SKILL | SPECIAL_APPEAL | TRAIT",
  "traitEffects": "TraitEffectType[] (optional) - dynamic string values for trait effects",
  "hasTokens": "boolean (optional) - true: has token cards, false: no token cards",
  "excludeSkillEffects": "SkillEffectType[] (optional) - exclude cards with these skill effects",
  "excludeSkillSearchTargets": "SkillSearchTarget[] (optional) - scope for excludeSkillEffects",
  "excludeSkillMainEffects": "SkillEffectType[] (optional) - exclude cards with these main skill effects",
  "excludeTraitEffects": "TraitEffectType[] (optional) - exclude cards with these trait effects",
  "filterMode": "FilterMode (optional) - OR (default) | AND"
}
````

## Character Names (Japanese)

日野下花帆, 村野さやか, 乙宗梢, 夕霧綴理, 大沢瑠璃乃, 藤島慈, 徒町小鈴, 百生吟子, 安養寺姫芽, 桂城泉, セラス, 大賀美沙知

## Rules

- When multiple filter conditions are specified, set filterMode to "AND"
- When only one condition is specified, filterMode is optional (defaults to OR)
- For exclusion conditions, use the "exclude\*" fields
- If the query is ambiguous, prefer broader filters
- ALWAYS return only a valid JSON object. No explanation, no markdown code block.
- Unknown skill/trait effect names should be passed as-is as strings

## Example

Input: "花帆でリシャッフルできるSRカードは？"
Output: {"rarities":["SR"],"characterNames":["日野下花帆"],"skillEffects":["RESHUFFLE"],"filterMode":"AND"}

````

#### リクエスト（Ollama Chat API 形式）
```json
{
  "model": "gemma4:e4b",
  "messages": [
    {
      "role": "system",
      "content": "<上記システムプロンプト>"
    },
    {
      "role": "user",
      "content": "花帆でリシャッフルできるSRカードは？"
    }
  ],
  "stream": false,
  "options": {
    "temperature": 0.1,
    "top_p": 0.95,
    "top_k": 64
  },
  "format": "json"
}
````

> **ポイント**: `"format": "json"` を指定することで Ollama が JSON 形式の出力を強制する。temperature を低く（0.1）設定することで応答の安定性を上げる。

---

## 5. 認証・セキュリティ設計

### 5.1 クライアント → Firebase Functions 間

- Firebase ID Token（Bearer）による認証
- 既存の `authenticate` ミドルウェアを再利用

### 5.2 Firebase Functions → Cloud Run 間（サービス間認証）

Cloud Run は `--no-allow-unauthenticated` のため、Firebase Functions の実行サービスアカウントに対して IAM ロール付与が必要。

```bash
# Firebase Functions のサービスアカウントに Cloud Run 呼び出しロールを付与
gcloud run services add-iam-policy-binding lles-llm-engine \
  --region=asia-northeast1 \
  --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

`OllamaClient.ts` 内で Google Auth Library を使用して OIDC トークンを取得してリクエストヘッダーに付与する。

```typescript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
const response = await client.request({ ... });
```

---

## 6. 実装詳細

### 6.1 `OllamaClient.ts`

```typescript
// functions/src/infrastructure/ai/OllamaClient.ts

interface OllamaChatRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  options?: { temperature?: number; top_p?: number; top_k?: number };
  format?: string;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
}

export class OllamaClient {
  constructor(private readonly baseUrl: string) {}

  async chat(request: OllamaChatRequest): Promise<string> {
    // GoogleAuth で認証付き HTTP クライアントを取得
    // POST /api/chat へリクエスト
    // response.message.content を返却
  }
}
```

### 6.2 `CardFilterAiService.ts`

用途ごとに Service クラスを分離することで、`OllamaClient` は複数の Service から共有できる。

```typescript
// functions/src/application/services/CardFilterAiService.ts

export class CardFilterAiService {
  constructor(private readonly ollamaClient: OllamaClient) {}

  async generateCardFilter(query: string): Promise<CardFilter> {
    // 1. カードフィルタ用システムプロンプト構築
    // 2. OllamaClient.chat() 呼び出し
    // 3. レスポンスを JSON.parse して CardFilter にキャスト
    // 4. 最低限のバリデーション（不正な enum 値の除去）
    // 5. CardFilter を返却
  }
}

// 将来追加例:
// export class DeckSuggestAiService {
//   constructor(private readonly ollamaClient: OllamaClient) {}
//   async suggestDeck(...): Promise<DeckSuggestion> { ... }
// }
```

### 6.3 `index.ts` への追記

```typescript
// aiApi（新規）
const aiApp = express();
aiApp.use(cors({ origin: true }));
aiApp.use(express.json());
aiApp.use("/", createAiRouter());
aiApp.use(errorHandler);

export const aiApi = functions
  .region("asia-northeast1")
  .https.onRequest(Sentry.wrapHttpFunction(aiApp));
```

---

## 7. 環境変数

`.env` に以下を追加:

```env
# AI エンジン（Cloud Run: lles-llm-engine）の URL
OLLAMA_BASE_URL=https://lles-llm-engine-xxxxxxxxxx-an.a.run.app

# 使用モデル名
OLLAMA_MODEL=gemma4:e4b
```

---

## 8. フロー図

```
[ユーザー入力]
"花帆でリシャッフルできるSRカードは？"
    │
    ▼
[Firebase Function: POST /cards/filter-query]
    │ Firebase ID Token で認証
    │
    ▼
[CardFilterAiService.generateCardFilter(query)]
    │ システムプロンプト + ユーザークエリを組み立て
    │
    ▼
[OllamaClient.chat()]
    │ OIDC トークンで Cloud Run に認証リクエスト
    │ POST https://lles-llm-engine-xxx/api/chat
    │ body: { model: "gemma4:e4b", messages: [...], format: "json" }
    │
    ▼
[Cloud Run: lles-llm-engine (Ollama + gemma4:e4b)]
    │ NVIDIA L4 GPU で推論
    │
    ▼
[JSON レスポンス]
{
  "rarities": ["SR"],
  "characterNames": ["日野下花帆"],
  "skillEffects": ["RESHUFFLE"],
  "filterMode": "AND"
}
    │
    ▼
[バリデーション & 不正値除去]
    │
    ▼
[フロントエンドに返却]
{ "filter": { ... } }
```

---

## 9. コスト試算

| リソース                  | 単価（概算）                 | 月間想定コスト       |
| ------------------------- | ---------------------------- | -------------------- |
| Cloud Run GPU (NVIDIA L4) | $0.000928 / vGPU秒           | リクエスト量依存     |
| Cloud Run CPU             | 8 vCPU: $0.00002400 / vCPU秒 | リクエスト量依存     |
| Cloud Run メモリ          | 32GB: $0.00000250 / GB秒     | リクエスト量依存     |
| Artifact Registry         | $0.10 / GB/月                | ~$1（10GB イメージ） |

> 最小インスタンス数 = 0（デフォルト）の場合、リクエストがない間は課金されない。ただしコールドスタート（初回起動）に GPU メモリへのロード時間がかかる点に注意。

---

## 10. 実装ステップ（推奨順序）

1. **Cloud Run AI エンジン構築**
   - `ollama-backend/Dockerfile` 作成
   - `gcloud run deploy` でデプロイ & GPU 割り当て確認
   - curl でレスポンスを動作確認

2. **Firebase Functions に `aiApi` 追加**
   - `OllamaClient.ts` 実装（サービス間認証含む）
   - `AiService.ts` 実装（プロンプト設計・バリデーション）
   - `AiController.ts`, `aiRoutes.ts`, `aiServiceFactory.ts` 実装
   - `index.ts` に `aiApi` を追加

3. **プロンプトチューニング**
   - 各種パターンの自然言語でテスト
   - システムプロンプトの精度改善

4. **OpenAPI 仕様書更新**
   - `docs/api-spec.yml` に `/cards/filter-query` エンドポイントを追記

---

## 11. 将来的な拡張案

- **キャッシュ**: 同一クエリの結果を Firestore にキャッシュして Cloud Run の呼び出し回数を削減
- **モデルアップグレード**: `gemma4:26b` への切り替えで精度向上
- **ストリーミング応答**: `stream: true` で進捗をクライアントにリアルタイム通知
- **フィードバックループ**: ユーザーがフィルタを修正した場合に正解データとして蓄積し、Few-shot プロンプトに反映
