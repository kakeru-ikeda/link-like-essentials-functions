/**
 * カードフィルタ条件（フロントエンドの models/shared/Filter.ts に準拠）
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
