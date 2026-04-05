import { InternalServerError, ValidationError } from '@/domain/errors/AppError';
import type { OllamaClient } from '@/infrastructure/ai/OllamaClient';
import type { PromptLoader } from '@/infrastructure/prompt/PromptLoader';

/**
 * CardFilter インターフェース（フロントエンドの models/shared/Filter.ts に準拠）
 */
export interface CardFilter {
  keyword?: string;
  rarities?: string[];
  characterNames?: string[];
  styleTypes?: string[];
  limitedTypes?: string[];
  favoriteModes?: string[];
  skillEffects?: string[];
  skillMainEffects?: string[];
  skillSearchTargets?: string[];
  traitEffects?: string[];
  hasTokens?: boolean;
  excludeSkillEffects?: string[];
  excludeSkillSearchTargets?: string[];
  excludeSkillMainEffects?: string[];
  excludeTraitEffects?: string[];
  filterMode?: 'OR' | 'AND';
}

/**
 * カードフィルタ生成用システムプロンプト（デフォルト）
 */
const DEFAULT_SYSTEM_PROMPT = `You are a card filter query builder for a Japanese card game application called "Link! Like! ラブライブ".
Your task is to parse a Japanese natural language query and return ONLY a valid JSON object matching the CardFilter interface.

## CardFilter Interface (all fields optional)
{
  "keyword": "string - partial match for card/character/skill/trait name and effect",
  "rarities": ["UR" | "SR" | "R" | "DR" | "BR" | "LR"],
  "characterNames": ["string - Japanese character names only"],
  "styleTypes": ["CHEERLEADER" | "TRICKSTER" | "PERFORMER" | "MOODMAKER"],
  "limitedTypes": ["PERMANENT" | "LIMITED" | "SPRING_LIMITED" | "SUMMER_LIMITED" | "AUTUMN_LIMITED" | "WINTER_LIMITED" | "BIRTHDAY_LIMITED" | "LEG_LIMITED" | "SHUFFLE_LIMITED" | "BATTLE_LIMITED" | "BANGDREAM_LIMITED" | "PARTY_LIMITED" | "ACTIVITY_LIMITED" | "GRADUATE_LIMITED" | "LOGIN_BONUS" | "REWARD"],
  "favoriteModes": ["NONE" | "HAPPY" | "MELLOW" | "NEUTRAL"],
  "skillEffects": ["string - skill effect type e.g. RESHUFFLE, HEAL, DRAW"],
  "skillMainEffects": ["string - primary skill effect type"],
  "skillSearchTargets": ["SKILL" | "SPECIAL_APPEAL" | "TRAIT"],
  "traitEffects": ["string - trait effect type"],
  "hasTokens": true | false,
  "excludeSkillEffects": ["string - exclude cards with these skill effects"],
  "excludeSkillSearchTargets": ["SKILL" | "SPECIAL_APPEAL" | "TRAIT"],
  "excludeSkillMainEffects": ["string - exclude cards with these main skill effects"],
  "excludeTraitEffects": ["string - exclude cards with these trait effects"],
  "filterMode": "OR" | "AND"
}

## Limited Types (limitedTypes)
Specifies how a card can be obtained. Use these values based on user's intent:
- PERMANENT: 恒常カード（「限定でない」「恒常のみ」「通常カード」）
- LIMITED: 限定カード全般（「限定」のみ指定の場合、または下記に当てはまらない場合）
- SPRING_LIMITED: 春限定
- SUMMER_LIMITED: 夏限定
- AUTUMN_LIMITED: 秋限定
- WINTER_LIMITED: 冬限定
- BIRTHDAY_LIMITED: バースデー限定
- LEG_LIMITED: LEG限定
- SHUFFLE_LIMITED: シャッフル限定
- BATTLE_LIMITED: オンゲキ限定
- BANGDREAM_LIMITED: バンドリ限定
- PARTY_LIMITED: 宴限定
- ACTIVITY_LIMITED: アイカツ限定
- GRADUATE_LIMITED: 卒業限定
- LOGIN_BONUS: ログインボーナス
- REWARD: 報酬
When user says 「限定でない」「限定以外」「恒常カード」, set limitedTypes:["PERMANENT","LOGIN_BONUS","REWARD"].
When user says 「限定カード」without specifying type, set limitedTypes:["LIMITED","SPRING_LIMITED","SUMMER_LIMITED","AUTUMN_LIMITED","WINTER_LIMITED","BIRTHDAY_LIMITED","LEG_LIMITED","SHUFFLE_LIMITED","BATTLE_LIMITED","BANGDREAM_LIMITED","PARTY_LIMITED","ACTIVITY_LIMITED","GRADUATE_LIMITED"].

## Character Names (use exact spelling)
日野下花帆, 村野さやか, 乙宗梢, 夕霧綴理, 大沢瑠璃乃, 藤島慈, 徒町小鈴, 百生吟子, 安養寺姫芽, 桂城泉, セラス, 大賀美沙知

## Skill Effects (skillEffects / skillMainEffects / excludeSkillEffects / excludeSkillMainEffects)
Use the effectType value (uppercase) that best matches the user's intent based on the description.
WIDE_HEART（ワイドハート）: 画面上に同時に存在できるハート数の上限を増加させる。
LOVE_ATTRACT（ラブアトラクト）: 回収したビートハートから獲得できるLOVEを増加させる。
VOLTAGE_GAIN（ボルテージゲイン）: ボルテージPt.を獲得する。
HEART_CAPTURE（ハートキャプチャ）: スキルハートを生成する。多くのものは、現在の1回あたりビートハート出現個数に比例して効果が増減する。
HEART_BOOST（ハートブースト）: スキルハート獲得効果の獲得数を増加させる。
WIDE_HEART_BOOST（ワイドハートブースト）: ハート上限個数増加効果の効果量を増加させる。
ATTRACT_BOOST（アトラクトブースト）: ラブアトラクト効果の効果量を増加させる。
VOLTAGE_BOOST（ボルテージブースト）: ボルテージゲイン効果の効果量を増加させる。
VIBES（バイブス）: 1回あたりのビートハート出現個数を増加させる。
AMBIENCE（アンビエンス）: ムード値を変動させる。
MENTAL_RECOVER（メンタルリカバー）: メンタルを回復する。
MENTAL_PROTECT（メンタルプロテクト）: メンタルへのダメージを無効化する。
MENTAL_GUARD（メンタルガード）: メンタルへの直接ダメージを無効化する。
RESHUFFLE（リシャッフル）: 手札を捨てて山札をシャッフルする。
EXTEND_HAND（エクステンドハンド）: 手札の上限枚数を増加させる。
SEARCH（サーチ）: 特定のカードをドローしやすくする。
BLESSING（ブレッシング）: デッキ内や手札の特定カードの消費APを減少させる。
IMITATION（イミテーション）: 他のカードの効果をコピーして発動する。
AP_GAIN（APゲイン）: APを回復する。
HEAT_UP（ヒートアップ）: AP回復速度を増加させる。
BELIEF（ビリーフ）: メンタルダウン状態にならなくする。
IGNITION（イグニッション）: イグニッションモードを発動する。

## Skill Search Targets (skillSearchTargets / excludeSkillSearchTargets)
Specifies WHICH PART of the card's skill to apply the skillEffects filter to.
- SKILL: スキル効果（「スキルで〜」「スキル効果として〜」）
- SPECIAL_APPEAL: スペシャルアピール効果（「スペシャルアピールで〜」）
- TRAIT: 特性（「特性として〜」「特性で〜」「特性によって〜」）
Use skillSearchTargets together with skillEffects to narrow the search scope. Example: 「特性でハート上限を増加」→ skillEffects:["WIDE_HEART"], skillSearchTargets:["TRAIT"]

## Trait Effects (traitEffects / excludeTraitEffects)
"〜時に発動" "〜を条件に" "〜のとき" など、カードの発動条件・特性に関する表現はtraitEffectsを使う。
HEART_COLLECT（ハートコレクト）: ハート回収を条件に発動する特性。
ENCORE（アンコール）: スキル使用後に山札へ戻る特性。
SHOT（ショット）: スキル使用回数を条件に発動する特性。
DRAW（ドロー）: ドロー時に発動する特性。
AP_REDUCE（APレデュース）: このスキルの消費APを減少させる特性。
AP_SUPPORT（APサポート）: デッキ内の他カードの消費APを減少させる特性。
INSTANCE（インスタンス）: デッキから除外され、一度きりの使用となる特性。
IMMORTAL（インモータル）: デッキから除外されない特性。
INTERPRETATION（インタープリテーション）: ムードによる効果増加量を上昇させる特性。
ACCUMULATE（アキューミュレイト）: 使用するたびに効果が増加する特性。
OVER_SECTION（オーバーセクション）: 手札にある状態でセクションを跨ぐと発動する特性。
ALTERNATE_IGNITION（オルタネイト：イグニッション）: オルタネイト：イグニッションを発動する特性。
CHAIN（チェイン）: スキル使用後にドローされやすくなる特性。
FAVORITE（フェイバリット）: 特定セクションでドローされやすくなる特性。
REINFORCE（リインフォース）: スキル効果値を増加させる特性。
UN_DRAW（アンドロー）: ドローされない特性。

## Rules
1. When 2 or more distinct filter conditions are specified, set filterMode to "AND"
2. For exclusion requests (e.g. 「〜を除く」「〜以外」「〜ではない」「〜でない」), use ONLY the "exclude*" fields. NEVER simultaneously set the same value in both the positive field and its exclude counterpart.
3. skillEffects and traitEffects MUST only contain effectType values listed in the tables above. NEVER use "*", wildcards, or invented values.
4. If the query mentions a character name (including nicknames like「花帆」→「日野下花帆」,「さやか」→「村野さやか」,「梢」→「乙宗梢」,「綴理」→「夕霧綴理」,「瑠璃乃」→「大沢瑠璃乃」,「慈」→「藤島慈」,「小鈴」→「徒町小鈴」,「吟子」→「百生吟子」,「姫芽」→「安養寺姫芽」,「泉」→「桂城泉」), use the full Japanese name
5. Rarity mentions: UR, SR, R, DR, BR, LR — use uppercase as-is
6. ALWAYS output ONLY a raw JSON object. NO markdown, NO explanation, NO code block.

## Examples
Input: 「花帆でリシャッフルできるSRカードは？」
Output: {"rarities":["SR"],"characterNames":["日野下花帆"],"skillEffects":["RESHUFFLE"],"filterMode":"AND"}

Input: 「URのチアリーダーカードが見たい」
Output: {"rarities":["UR"],"styleTypes":["CHEERLEADER"],"filterMode":"AND"}

Input: 「さやかのカード一覧」
Output: {"characterNames":["村野さやか"]}

Input: 「リシャッフルを除外したURカード」
Output: {"rarities":["UR"],"excludeSkillEffects":["RESHUFFLE"],"filterMode":"AND"}

Input: 「さやかでドロー時にハートキャプチャするカードは？」
Output: {"characterNames":["村野さやか"],"skillEffects":["HEART_CAPTURE"],"traitEffects":["DRAW"],"filterMode":"AND"}

Input: 「ハートを出せるカード」
Output: {"skillEffects":["HEART_CAPTURE"]}

Input: 「メインがハートキャプチャではない、ドロー時にハート上限を増加できるカード」
Output: {"excludeSkillMainEffects":["HEART_CAPTURE"],"traitEffects":["DRAW"],"skillEffects":["WIDE_HEART"],"filterMode":"AND"}

Input: 「特性でハート上限を増加できるURの梢のカード」
Output: {"rarities":["UR"],"characterNames":["乙宗梢"],"skillEffects":["WIDE_HEART"],"skillSearchTargets":["TRAIT"],"filterMode":"AND"}

Input: 「メインがハートキャプチャではない、特性でハート上限を増加できるURの梢のカード」
Output: {"rarities":["UR"],"characterNames":["乙宗梢"],"excludeSkillMainEffects":["HEART_CAPTURE"],"skillEffects":["WIDE_HEART"],"skillSearchTargets":["TRAIT"],"filterMode":"AND"}

Input: 「限定でないURカード」
Output: {"rarities":["UR"],"limitedTypes":["PERMANENT","LOGIN_BONUS","REWARD"],"filterMode":"AND"}

Input: 「バースデー限定またはシャッフル限定のSR」
Output: {"rarities":["SR"],"limitedTypes":["BIRTHDAY_LIMITED","SHUFFLE_LIMITED"],"filterMode":"AND"}`;

/**
 * CardFilterAiService
 * 自然言語クエリを解析して CardFilter JSON を生成する。
 * OllamaClient を通じて LLM に問い合わせ、レスポンスをバリデーションして返却する。
 */
export class CardFilterAiService {
  constructor(
    private readonly ollamaClient: OllamaClient,
    private readonly model: string,
    private readonly promptLoader: PromptLoader
  ) {}

  async generateCardFilter(query: string): Promise<CardFilter> {
    const systemPrompt =
      (await this.promptLoader.load()) || DEFAULT_SYSTEM_PROMPT;
    const rawContent = await this.ollamaClient.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      stream: false,
      format: 'json',
    });

    let parsed: unknown;
    try {
      // LLM がスカラー値の直後に余分な ] を生成することがあるため前処理で除去する
      const cleaned = rawContent.replace(/\b(false|true|null)\s*\]/g, '$1');
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerError(
        'LLM のレスポンスが JSON として解析できませんでした'
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new InternalServerError('LLM のレスポンスが不正な形式です');
    }

    return this.sanitize(parsed as Record<string, unknown>);
  }

  /**
   * LLM が返した JSON から不正な値を除去し安全な CardFilter を生成する
   */
  private sanitize(raw: Record<string, unknown>): CardFilter {
    const validRarities = new Set(['UR', 'SR', 'R', 'DR', 'BR', 'LR']);
    const validStyleTypes = new Set([
      'CHEERLEADER',
      'TRICKSTER',
      'PERFORMER',
      'MOODMAKER',
    ]);
    const validLimitedTypes = new Set([
      'PERMANENT',
      'LIMITED',
      'SPRING_LIMITED',
      'SUMMER_LIMITED',
      'AUTUMN_LIMITED',
      'WINTER_LIMITED',
      'BIRTHDAY_LIMITED',
      'LEG_LIMITED',
      'SHUFFLE_LIMITED',
      'BATTLE_LIMITED',
      'BANGDREAM_LIMITED',
      'PARTY_LIMITED',
      'ACTIVITY_LIMITED',
      'GRADUATE_LIMITED',
      'LOGIN_BONUS',
      'REWARD',
    ]);
    const validFavoriteModes = new Set(['NONE', 'HAPPY', 'MELLOW', 'NEUTRAL']);
    const validSkillSearchTargets = new Set([
      'SKILL',
      'SPECIAL_APPEAL',
      'TRAIT',
    ]);
    const validSkillEffects = new Set([
      'WIDE_HEART',
      'LOVE_ATTRACT',
      'VOLTAGE_GAIN',
      'HEART_CAPTURE',
      'HEART_BOOST',
      'WIDE_HEART_BOOST',
      'ATTRACT_BOOST',
      'VOLTAGE_BOOST',
      'VIBES',
      'AMBIENCE',
      'MENTAL_RECOVER',
      'MENTAL_PROTECT',
      'MENTAL_GUARD',
      'RESHUFFLE',
      'EXTEND_HAND',
      'SEARCH',
      'BLESSING',
      'IMITATION',
      'AP_GAIN',
      'HEAT_UP',
      'BELIEF',
      'IGNITION',
    ]);
    const validTraitEffects = new Set([
      'HEART_COLLECT',
      'ENCORE',
      'SHOT',
      'DRAW',
      'AP_REDUCE',
      'AP_SUPPORT',
      'INSTANCE',
      'IMMORTAL',
      'INTERPRETATION',
      'ACCUMULATE',
      'OVER_SECTION',
      'ALTERNATE_IGNITION',
      'CHAIN',
      'FAVORITE',
      'REINFORCE',
      'UN_DRAW',
    ]);
    const validFilterModes = new Set(['OR', 'AND']);

    const filterString = (
      arr: unknown,
      allowed?: Set<string>
    ): string[] | undefined => {
      if (!Array.isArray(arr)) return undefined;
      const filtered = arr
        .filter((v): v is string => typeof v === 'string')
        .filter((v) => (allowed ? allowed.has(v) : true));
      return filtered.length > 0 ? filtered : undefined;
    };

    const result: CardFilter = {};

    if (typeof raw['keyword'] === 'string' && raw['keyword'].trim() !== '') {
      result.keyword = raw['keyword'].trim();
    }
    result.rarities = filterString(raw['rarities'], validRarities);
    result.characterNames = filterString(raw['characterNames']);
    result.styleTypes = filterString(raw['styleTypes'], validStyleTypes);
    result.limitedTypes = filterString(raw['limitedTypes'], validLimitedTypes);
    result.favoriteModes = filterString(
      raw['favoriteModes'],
      validFavoriteModes
    );
    result.skillEffects = filterString(raw['skillEffects'], validSkillEffects);
    result.skillMainEffects = filterString(
      raw['skillMainEffects'],
      validSkillEffects
    );
    result.skillSearchTargets = filterString(
      raw['skillSearchTargets'],
      validSkillSearchTargets
    );
    result.traitEffects = filterString(raw['traitEffects'], validTraitEffects);
    result.excludeSkillEffects = filterString(
      raw['excludeSkillEffects'],
      validSkillEffects
    );
    result.excludeSkillSearchTargets = filterString(
      raw['excludeSkillSearchTargets'],
      validSkillSearchTargets
    );
    result.excludeSkillMainEffects = filterString(
      raw['excludeSkillMainEffects'],
      validSkillEffects
    );
    result.excludeTraitEffects = filterString(
      raw['excludeTraitEffects'],
      validTraitEffects
    );

    if (typeof raw['hasTokens'] === 'boolean') {
      result.hasTokens = raw['hasTokens'];
    }

    const fm = raw['filterMode'];
    if (typeof fm === 'string' && validFilterModes.has(fm)) {
      result.filterMode = fm as 'OR' | 'AND';
    }

    // 有効なフィルタが何もない場合はエラー
    const hasFilter = Object.keys(result).some((k) => {
      const v = result[k as keyof CardFilter];
      return v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
    });

    if (!hasFilter) {
      throw new ValidationError(
        'クエリからフィルタ条件を抽出できませんでした。より具体的な条件を入力してください。'
      );
    }

    return result;
  }
}
