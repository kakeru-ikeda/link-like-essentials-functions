export const RARITIES = [
  'mUR',
  'UR',
  'mSR',
  'SR',
  'R',
  'DR',
  'BR',
  'LR',
] as const;

export type Rarity = (typeof RARITIES)[number];
