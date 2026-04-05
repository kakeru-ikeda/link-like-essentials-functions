import { InternalServerError, ValidationError } from '@/domain/errors/AppError';
import type { OllamaClient } from '@/infrastructure/ai/OllamaClient';

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
 * カードフィルタ生成用システムプロンプト
 */
const SYSTEM_PROMPT = `You are a card filter query builder for a Japanese card game application called "Link! Like! ラブライブ".
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

## Character Names (use exact spelling)
日野下花帆, 村野さやか, 乙宗梢, 夕霧綴理, 大沢瑠璃乃, 藤島慈, 徒町小鈴, 百生吟子, 安養寺姫芽, 桂城泉, セラス, 大賀美沙知

## Skill Effect Examples
RESHUFFLE（リシャッフル）, HEAL（回復）, DRAW（ドロー）, SCORE_UP（スコアアップ）, SHIELD（シールド）

## Rules
1. When 2 or more distinct filter conditions are specified, set filterMode to "AND"
2. For exclusion requests (e.g. 「〜を除く」「〜以外」), use the "exclude*" fields
3. If the query mentions a character name (including nicknames like「花帆」→「日野下花帆」,「さやか」→「村野さやか」,「梢」→「乙宗梢」,「綴理」→「夕霧綴理」,「瑠璃乃」→「大沢瑠璃乃」,「慈」→「藤島慈」,「小鈴」→「徒町小鈴」,「吟子」→「百生吟子」,「姫芽」→「安養寺姫芽」,「泉」→「桂城泉」), use the full Japanese name
4. Rarity mentions: UR, SR, R, DR, BR, LR — use uppercase as-is
5. ALWAYS output ONLY a raw JSON object. NO markdown, NO explanation, NO code block.

## Examples
Input: 「花帆でリシャッフルできるSRカードは？」
Output: {"rarities":["SR"],"characterNames":["日野下花帆"],"skillEffects":["RESHUFFLE"],"filterMode":"AND"}

Input: 「URのチアリーダーカードが見たい」
Output: {"rarities":["UR"],"styleTypes":["CHEERLEADER"],"filterMode":"AND"}

Input: 「さやかのカード一覧」
Output: {"characterNames":["村野さやか"]}

Input: 「リシャッフルを除外したURカード」
Output: {"rarities":["UR"],"excludeSkillEffects":["RESHUFFLE"],"filterMode":"AND"}`;

/**
 * CardFilterAiService
 * 自然言語クエリを解析して CardFilter JSON を生成する。
 * OllamaClient を通じて LLM に問い合わせ、レスポンスをバリデーションして返却する。
 */
export class CardFilterAiService {
  constructor(
    private readonly ollamaClient: OllamaClient,
    private readonly model: string
  ) {}

  async generateCardFilter(query: string): Promise<CardFilter> {
    const rawContent = await this.ollamaClient.chat({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.95,
        top_k: 64,
      },
      format: 'json',
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new InternalServerError(
        'LLM のレスポンスが JSON として解析できませんでした'
      );
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
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
    result.skillEffects = filterString(raw['skillEffects']);
    result.skillMainEffects = filterString(raw['skillMainEffects']);
    result.skillSearchTargets = filterString(
      raw['skillSearchTargets'],
      validSkillSearchTargets
    );
    result.traitEffects = filterString(raw['traitEffects']);
    result.excludeSkillEffects = filterString(raw['excludeSkillEffects']);
    result.excludeSkillSearchTargets = filterString(
      raw['excludeSkillSearchTargets'],
      validSkillSearchTargets
    );
    result.excludeSkillMainEffects = filterString(raw['excludeSkillMainEffects']);
    result.excludeTraitEffects = filterString(raw['excludeTraitEffects']);

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
