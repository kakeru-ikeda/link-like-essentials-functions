import { randomUUID } from 'crypto';
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

import { StorageUtility } from '@/infrastructure/storage/StorageUtility';

export interface ThumbnailDeckSlot {
  slotId: number;
  cardId: string | null;
  limitBreak?: number;
}

export interface ThumbnailDeck {
  id: string;
  name: string;
  slots: ThumbnailDeckSlot[];
  aceSlotId: number | null;
  deckType?: string;
  centerCharacter?: string;
  participations?: string[];
  isFriendSlotEnabled?: boolean;
}

export interface ThumbnailCardDetail {
  awakeAfterStorageUrl?: string;
}

export interface ThumbnailCard {
  id: string;
  cardName: string;
  characterName: string;
  rarity: 'UR' | 'SR' | 'R' | 'DR' | 'BR' | 'LR';
  detail?: ThumbnailCardDetail;
}

interface DeckSlotMapping {
  slotId: number;
  characterName: CharacterName;
  slotType: 'main' | 'side';
  row: number;
  col: number;
}

interface SlotData {
  slot: ThumbnailDeckSlot;
  card: ThumbnailCard | null;
  mapping: DeckSlotMapping;
}

interface CharacterGroup {
  character: CharacterName;
  slots: SlotData[];
}

type CharacterName =
  | '日野下花帆'
  | '村野さやか'
  | '乙宗梢'
  | '夕霧綴理'
  | '大沢瑠璃乃'
  | '藤島慈'
  | '徒町小鈴'
  | '百生吟子'
  | '安養寺姫芽'
  | '桂城泉'
  | 'セラス'
  | '大賀美沙知'
  | 'フリー'
  | 'フレンド';

const FRIEND_SLOT_ID = 99;

const CHARACTER_COLORS: Record<string, string> = {
  日野下花帆: '#f8b500',
  村野さやか: '#5383c3',
  乙宗梢: '#68be8d',
  夕霧綴理: '#ba2636',
  大沢瑠璃乃: '#e7609e',
  藤島慈: '#c8c2c6',
  徒町小鈴: '#fad764',
  百生吟子: '#a2d7dd',
  安養寺姫芽: '#9d8de2',
  桂城泉: '#1ebecd',
  セラス: '#f56455',
  大賀美沙知: '#aacc88',
};

const DECK_SLOT_MAPPING_105: DeckSlotMapping[] = [
  { slotId: 0, characterName: 'セラス', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: 'セラス', slotType: 'side', row: 0, col: 2 },
  { slotId: 2, characterName: '桂城泉', slotType: 'main', row: 0, col: 3 },
  { slotId: 3, characterName: '桂城泉', slotType: 'side', row: 0, col: 4 },
  { slotId: 4, characterName: 'フリー', slotType: 'side', row: 0, col: 5 },
  { slotId: 5, characterName: 'フリー', slotType: 'side', row: 0, col: 6 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 6, characterName: '百生吟子', slotType: 'main', row: 1, col: 0 },
  { slotId: 7, characterName: '百生吟子', slotType: 'side', row: 1, col: 1 },
  { slotId: 8, characterName: '徒町小鈴', slotType: 'main', row: 1, col: 2 },
  { slotId: 9, characterName: '徒町小鈴', slotType: 'side', row: 1, col: 3 },
  { slotId: 10, characterName: '安養寺姫芽', slotType: 'main', row: 1, col: 4 },
  { slotId: 11, characterName: '安養寺姫芽', slotType: 'side', row: 1, col: 5 },
  { slotId: 12, characterName: '日野下花帆', slotType: 'main', row: 2, col: 0 },
  { slotId: 13, characterName: '日野下花帆', slotType: 'side', row: 2, col: 1 },
  { slotId: 14, characterName: '村野さやか', slotType: 'main', row: 2, col: 2 },
  { slotId: 15, characterName: '村野さやか', slotType: 'side', row: 2, col: 3 },
  { slotId: 16, characterName: '大沢瑠璃乃', slotType: 'main', row: 2, col: 4 },
  { slotId: 17, characterName: '大沢瑠璃乃', slotType: 'side', row: 2, col: 5 },
];

const DECK_SLOT_MAPPING_104: DeckSlotMapping[] = [
  { slotId: 0, characterName: '百生吟子', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: '百生吟子', slotType: 'side', row: 0, col: 2 },
  { slotId: 2, characterName: '徒町小鈴', slotType: 'main', row: 0, col: 3 },
  { slotId: 3, characterName: '徒町小鈴', slotType: 'side', row: 0, col: 4 },
  { slotId: 4, characterName: '安養寺姫芽', slotType: 'main', row: 0, col: 5 },
  { slotId: 5, characterName: '安養寺姫芽', slotType: 'side', row: 0, col: 6 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 6, characterName: '日野下花帆', slotType: 'main', row: 1, col: 0 },
  { slotId: 7, characterName: '日野下花帆', slotType: 'side', row: 1, col: 1 },
  { slotId: 8, characterName: '村野さやか', slotType: 'main', row: 1, col: 2 },
  { slotId: 9, characterName: '村野さやか', slotType: 'side', row: 1, col: 3 },
  { slotId: 10, characterName: '大沢瑠璃乃', slotType: 'main', row: 1, col: 4 },
  { slotId: 11, characterName: '大沢瑠璃乃', slotType: 'side', row: 1, col: 5 },
  { slotId: 12, characterName: '乙宗梢', slotType: 'main', row: 2, col: 0 },
  { slotId: 13, characterName: '乙宗梢', slotType: 'side', row: 2, col: 1 },
  { slotId: 14, characterName: '夕霧綴理', slotType: 'main', row: 2, col: 2 },
  { slotId: 15, characterName: '夕霧綴理', slotType: 'side', row: 2, col: 3 },
  { slotId: 16, characterName: '藤島慈', slotType: 'main', row: 2, col: 4 },
  { slotId: 17, characterName: '藤島慈', slotType: 'side', row: 2, col: 5 },
];

const DECK_SLOT_MAPPING_103: DeckSlotMapping[] = [
  { slotId: 0, characterName: '日野下花帆', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: '日野下花帆', slotType: 'side', row: 0, col: 2 },
  { slotId: 2, characterName: '日野下花帆', slotType: 'side', row: 0, col: 3 },
  { slotId: 3, characterName: '村野さやか', slotType: 'main', row: 0, col: 4 },
  { slotId: 4, characterName: '村野さやか', slotType: 'side', row: 0, col: 5 },
  { slotId: 5, characterName: '村野さやか', slotType: 'side', row: 0, col: 6 },
  { slotId: 6, characterName: '大沢瑠璃乃', slotType: 'main', row: 0, col: 7 },
  { slotId: 7, characterName: '大沢瑠璃乃', slotType: 'side', row: 0, col: 8 },
  { slotId: 8, characterName: '大沢瑠璃乃', slotType: 'side', row: 0, col: 9 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 9, characterName: '乙宗梢', slotType: 'main', row: 2, col: 0 },
  { slotId: 10, characterName: '乙宗梢', slotType: 'side', row: 2, col: 1 },
  { slotId: 11, characterName: '乙宗梢', slotType: 'side', row: 2, col: 2 },
  { slotId: 12, characterName: '夕霧綴理', slotType: 'main', row: 2, col: 3 },
  { slotId: 13, characterName: '夕霧綴理', slotType: 'side', row: 2, col: 4 },
  { slotId: 14, characterName: '夕霧綴理', slotType: 'side', row: 2, col: 5 },
  { slotId: 15, characterName: '藤島慈', slotType: 'main', row: 2, col: 6 },
  { slotId: 16, characterName: '藤島慈', slotType: 'side', row: 2, col: 7 },
  { slotId: 17, characterName: '藤島慈', slotType: 'side', row: 2, col: 8 },
];

const DECK_SLOT_MAPPING_102: DeckSlotMapping[] = [
  { slotId: 0, characterName: '乙宗梢', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: '乙宗梢', slotType: 'side', row: 0, col: 2 },
  { slotId: 2, characterName: '夕霧綴理', slotType: 'main', row: 0, col: 3 },
  { slotId: 3, characterName: '夕霧綴理', slotType: 'side', row: 0, col: 4 },
  { slotId: 4, characterName: '藤島慈', slotType: 'main', row: 0, col: 5 },
  { slotId: 5, characterName: '藤島慈', slotType: 'side', row: 0, col: 6 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 6, characterName: 'フリー', slotType: 'side', row: 1, col: 0 },
  { slotId: 7, characterName: 'フリー', slotType: 'side', row: 1, col: 1 },
  { slotId: 8, characterName: 'フリー', slotType: 'side', row: 1, col: 2 },
  { slotId: 9, characterName: 'フリー', slotType: 'side', row: 1, col: 3 },
  { slotId: 10, characterName: 'フリー', slotType: 'side', row: 1, col: 4 },
  { slotId: 11, characterName: 'フリー', slotType: 'side', row: 1, col: 5 },
  { slotId: 12, characterName: 'フリー', slotType: 'side', row: 2, col: 0 },
  { slotId: 13, characterName: 'フリー', slotType: 'side', row: 2, col: 1 },
  { slotId: 14, characterName: 'フリー', slotType: 'side', row: 2, col: 2 },
  { slotId: 15, characterName: 'フリー', slotType: 'side', row: 2, col: 3 },
  { slotId: 16, characterName: 'フリー', slotType: 'side', row: 2, col: 4 },
  { slotId: 17, characterName: 'フリー', slotType: 'side', row: 2, col: 5 },
];

const DECK_SLOT_MAPPING_105_FT_KOZUE: DeckSlotMapping[] = [
  { slotId: 0, characterName: '乙宗梢', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: '乙宗梢', slotType: 'side', row: 0, col: 2 },
  { slotId: 4, characterName: '桂城泉', slotType: 'main', row: 0, col: 3 },
  { slotId: 5, characterName: '桂城泉', slotType: 'side', row: 0, col: 4 },
  { slotId: 2, characterName: 'セラス', slotType: 'main', row: 0, col: 5 },
  { slotId: 3, characterName: 'セラス', slotType: 'side', row: 0, col: 6 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 6, characterName: '百生吟子', slotType: 'main', row: 1, col: 0 },
  { slotId: 7, characterName: '百生吟子', slotType: 'side', row: 1, col: 1 },
  { slotId: 8, characterName: '徒町小鈴', slotType: 'main', row: 1, col: 2 },
  { slotId: 9, characterName: '徒町小鈴', slotType: 'side', row: 1, col: 3 },
  { slotId: 10, characterName: '安養寺姫芽', slotType: 'main', row: 1, col: 4 },
  { slotId: 11, characterName: '安養寺姫芽', slotType: 'side', row: 1, col: 5 },
  { slotId: 12, characterName: '日野下花帆', slotType: 'main', row: 2, col: 0 },
  { slotId: 13, characterName: '日野下花帆', slotType: 'side', row: 2, col: 1 },
  { slotId: 14, characterName: '村野さやか', slotType: 'main', row: 2, col: 2 },
  { slotId: 15, characterName: '村野さやか', slotType: 'side', row: 2, col: 3 },
  { slotId: 16, characterName: '大沢瑠璃乃', slotType: 'main', row: 2, col: 4 },
  { slotId: 17, characterName: '大沢瑠璃乃', slotType: 'side', row: 2, col: 5 },
];

const DECK_SLOT_MAPPING_105_FT_TSUZURI: DeckSlotMapping[] = [
  { slotId: 0, characterName: '夕霧綴理', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: '夕霧綴理', slotType: 'side', row: 0, col: 2 },
  { slotId: 4, characterName: '桂城泉', slotType: 'main', row: 0, col: 3 },
  { slotId: 5, characterName: '桂城泉', slotType: 'side', row: 0, col: 4 },
  { slotId: 2, characterName: 'セラス', slotType: 'main', row: 0, col: 5 },
  { slotId: 3, characterName: 'セラス', slotType: 'side', row: 0, col: 6 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 6, characterName: '百生吟子', slotType: 'main', row: 1, col: 0 },
  { slotId: 7, characterName: '百生吟子', slotType: 'side', row: 1, col: 1 },
  { slotId: 8, characterName: '徒町小鈴', slotType: 'main', row: 1, col: 2 },
  { slotId: 9, characterName: '徒町小鈴', slotType: 'side', row: 1, col: 3 },
  { slotId: 10, characterName: '安養寺姫芽', slotType: 'main', row: 1, col: 4 },
  { slotId: 11, characterName: '安養寺姫芽', slotType: 'side', row: 1, col: 5 },
  { slotId: 12, characterName: '日野下花帆', slotType: 'main', row: 2, col: 0 },
  { slotId: 13, characterName: '日野下花帆', slotType: 'side', row: 2, col: 1 },
  { slotId: 14, characterName: '村野さやか', slotType: 'main', row: 2, col: 2 },
  { slotId: 15, characterName: '村野さやか', slotType: 'side', row: 2, col: 3 },
  { slotId: 16, characterName: '大沢瑠璃乃', slotType: 'main', row: 2, col: 4 },
  { slotId: 17, characterName: '大沢瑠璃乃', slotType: 'side', row: 2, col: 5 },
];

const DECK_SLOT_MAPPING_105_FT_MEGUMI: DeckSlotMapping[] = [
  { slotId: 0, characterName: '藤島慈', slotType: 'main', row: 0, col: 1 },
  { slotId: 1, characterName: '藤島慈', slotType: 'side', row: 0, col: 2 },
  { slotId: 4, characterName: '桂城泉', slotType: 'main', row: 0, col: 3 },
  { slotId: 5, characterName: '桂城泉', slotType: 'side', row: 0, col: 4 },
  { slotId: 2, characterName: 'セラス', slotType: 'main', row: 0, col: 5 },
  { slotId: 3, characterName: 'セラス', slotType: 'side', row: 0, col: 6 },
  {
    slotId: FRIEND_SLOT_ID,
    characterName: 'フレンド',
    slotType: 'side',
    row: 0,
    col: 0,
  },
  { slotId: 6, characterName: '百生吟子', slotType: 'main', row: 1, col: 0 },
  { slotId: 7, characterName: '百生吟子', slotType: 'side', row: 1, col: 1 },
  { slotId: 8, characterName: '徒町小鈴', slotType: 'main', row: 1, col: 2 },
  { slotId: 9, characterName: '徒町小鈴', slotType: 'side', row: 1, col: 3 },
  { slotId: 10, characterName: '安養寺姫芽', slotType: 'main', row: 1, col: 4 },
  { slotId: 11, characterName: '安養寺姫芽', slotType: 'side', row: 1, col: 5 },
  { slotId: 12, characterName: '日野下花帆', slotType: 'main', row: 2, col: 0 },
  { slotId: 13, characterName: '日野下花帆', slotType: 'side', row: 2, col: 1 },
  { slotId: 14, characterName: '村野さやか', slotType: 'main', row: 2, col: 2 },
  { slotId: 15, characterName: '村野さやか', slotType: 'side', row: 2, col: 3 },
  { slotId: 16, characterName: '大沢瑠璃乃', slotType: 'main', row: 2, col: 4 },
  { slotId: 17, characterName: '大沢瑠璃乃', slotType: 'side', row: 2, col: 5 },
];

const getDeckSlotMapping = (deckType?: string): DeckSlotMapping[] => {
  switch (deckType) {
    case '102期':
      return DECK_SLOT_MAPPING_102;
    case '103期':
      return DECK_SLOT_MAPPING_103;
    case '104期':
      return DECK_SLOT_MAPPING_104;
    case '105期':
      return DECK_SLOT_MAPPING_105;
    case '105期ft.梢':
      return DECK_SLOT_MAPPING_105_FT_KOZUE;
    case '105期ft.綴理':
      return DECK_SLOT_MAPPING_105_FT_TSUZURI;
    case '105期ft.慈':
      return DECK_SLOT_MAPPING_105_FT_MEGUMI;
    default:
      return DECK_SLOT_MAPPING_105;
  }
};

const getDeckFrame = (deckType?: string): CharacterName[] => {
  switch (deckType) {
    case '102期':
      return [
        '乙宗梢',
        '夕霧綴理',
        '藤島慈',
        'フレンド',
        'フリー',
        'フリー',
        'フリー',
        'フリー',
        'フリー',
        'フリー',
      ];
    case '103期':
      return [
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
        'フレンド',
        '乙宗梢',
        '夕霧綴理',
        '藤島慈',
      ];
    case '104期':
      return [
        '百生吟子',
        '徒町小鈴',
        '安養寺姫芽',
        'フレンド',
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
        '乙宗梢',
        '夕霧綴理',
        '藤島慈',
      ];
    case '105期':
      return [
        'セラス',
        '桂城泉',
        'フリー',
        'フレンド',
        '百生吟子',
        '徒町小鈴',
        '安養寺姫芽',
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
      ];
    case '105期ft.梢':
      return [
        '乙宗梢',
        '桂城泉',
        'セラス',
        'フレンド',
        '百生吟子',
        '徒町小鈴',
        '安養寺姫芽',
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
      ];
    case '105期ft.綴理':
      return [
        '夕霧綴理',
        '桂城泉',
        'セラス',
        'フレンド',
        '百生吟子',
        '徒町小鈴',
        '安養寺姫芽',
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
      ];
    case '105期ft.慈':
      return [
        '藤島慈',
        '桂城泉',
        'セラス',
        'フレンド',
        '百生吟子',
        '徒町小鈴',
        '安養寺姫芽',
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
      ];
    default:
      return [
        'セラス',
        '桂城泉',
        'フリー',
        'フレンド',
        '百生吟子',
        '徒町小鈴',
        '安養寺姫芽',
        '日野下花帆',
        '村野さやか',
        '大沢瑠璃乃',
      ];
  }
};

const getCharacterColor = (characterName: string): string =>
  CHARACTER_COLORS[characterName] || '#cccccc';

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getCharacterBackgroundColor = (
  characterName: string,
  opacity: number = 0.5
): string => {
  const color = getCharacterColor(characterName);
  return hexToRgba(color, opacity);
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildCharacterGroups = (
  deck: ThumbnailDeck,
  cards: ThumbnailCard[],
  slotMapping: DeckSlotMapping[],
  characterFrame: CharacterName[]
): CharacterGroup[] => {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const deckSlotMap = new Map(deck.slots.map((slot) => [slot.slotId, slot]));

  const mappingByCharacter = new Map<CharacterName, DeckSlotMapping[]>();
  slotMapping.forEach((mapping) => {
    const list = mappingByCharacter.get(mapping.characterName) ?? [];
    list.push(mapping);
    mappingByCharacter.set(mapping.characterName, list);
  });
  mappingByCharacter.forEach((list) =>
    list.sort((a, b) => a.slotId - b.slotId)
  );

  const mappingCopies = new Map<CharacterName, DeckSlotMapping[]>(
    Array.from(mappingByCharacter.entries()).map(([key, value]) => [
      key,
      [...value],
    ])
  );

  return characterFrame
    .map((character) => {
      const mappings = mappingCopies.get(character);
      if (!mappings || mappings.length === 0) return null;

      const groupSize = character === 'フリー' ? 2 : 3;
      const groupMappings = mappings.splice(0, groupSize);
      if (groupMappings.length === 0) return null;

      const slots = groupMappings.map((mapping) => {
        const deckSlot = deckSlotMap.get(mapping.slotId) ?? {
          slotId: mapping.slotId,
          cardId: null,
          limitBreak: 14,
        };
        const card = deckSlot.cardId
          ? (cardMap.get(deckSlot.cardId) ?? null)
          : null;
        return { slot: deckSlot, card, mapping };
      });

      return { character, slots };
    })
    .filter((group): group is CharacterGroup => group !== null)
    .filter(({ slots }) => slots.length > 0);
};

const renderCardSlot = (
  slotData: SlotData,
  aceSlotId: number | null,
  characterColor: string,
  isMain: boolean
): string => {
  const { slot, card, mapping } = slotData;
  const isAce = slot.slotId === aceSlotId && slot.slotId !== FRIEND_SLOT_ID;
  const limitBreak = slot.limitBreak ?? 14;

  if (!card) {
    const emptyText = isMain ? mapping.characterName : 'SIDE';
    return `
      <div class="card-slot empty ${isMain ? 'main-slot' : 'sub-slot'}" style="border-color: #d1d5db;">
        <span class="empty-text">${escapeHtml(emptyText)}</span>
      </div>
    `;
  }

  const cardImageUrl = card.detail?.awakeAfterStorageUrl || '';
  const cardName = escapeHtml(card.cardName);

  const aceBadgeHTML = isAce ? '<div class="ace-badge active"></div>' : '';
  const limitBreakClass = isMain ? 'main' : '';
  const cardNameClass = isMain ? 'main' : '';

  const imageHTML = cardImageUrl
    ? `<img src="${cardImageUrl}" alt="${cardName}" crossorigin="anonymous">`
    : `<div class="card-no-image"><span>画像なし</span></div>`;

  return `
    <div class="card-slot ${isMain ? 'main-slot' : 'sub-slot'}" style="border-color: ${characterColor};">
      ${aceBadgeHTML}
      ${imageHTML}
      <div class="limit-break-badge ${limitBreakClass}">${limitBreak}</div>
      <div class="card-name-overlay">
        <p class="card-name-text ${cardNameClass}">${cardName}</p>
      </div>
    </div>
  `;
};

const buildHTML = (deck: ThumbnailDeck, cards: ThumbnailCard[]): string => {
  const slotMapping = getDeckSlotMapping(deck.deckType);
  const characterFrame = getDeckFrame(deck.deckType);

  let filteredCharacterFrame =
    deck.isFriendSlotEnabled === false
      ? characterFrame.filter((character) => character !== 'フレンド')
      : characterFrame;

  if (deck.isFriendSlotEnabled !== false) {
    const friendIndex = filteredCharacterFrame.indexOf('フレンド');
    if (friendIndex !== -1) {
      filteredCharacterFrame = [
        ...filteredCharacterFrame.filter(
          (character) => character !== 'フレンド'
        ),
        'フレンド',
      ];
    }
  }

  const groups = buildCharacterGroups(
    deck,
    cards,
    slotMapping,
    filteredCharacterFrame
  );

  const deckName = escapeHtml(deck.name);
  const formattedDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const characterGroupsHTML = groups
    .map((group) => {
      const isCenter = deck.centerCharacter === group.character;
      const isSinger = deck.participations?.includes(group.character) || false;
      const bgColor = getCharacterBackgroundColor(group.character, 0.5);
      const charColor = getCharacterColor(group.character);

      const badgesHTML =
        isCenter || isSinger
          ? `
          <div class="badge-area">
            ${isCenter ? '<div class="vertical-badge center-badge">センター</div>' : ''}
            ${isSinger && !isCenter ? '<div class="vertical-badge singer-badge">歌唱</div>' : ''}
          </div>
        `
          : '';

      const mainSlot = group.slots[0];
      const subSlots = group.slots.slice(1);

      const mainSlotHTML = mainSlot
        ? renderCardSlot(mainSlot, deck.aceSlotId, charColor, true)
        : '';
      const subSlotsHTML = subSlots
        .map((slot) => renderCardSlot(slot, deck.aceSlotId, charColor, false))
        .join('');

      return `
        <div class="character-group" data-character="${group.character}">
          ${badgesHTML}
          <div class="card-slots" style="background-color: ${bgColor};">
            <div class="character-header">
              <h3>${group.character}</h3>
            </div>
            ${mainSlotHTML}
            <div class="sub-slots-row">
              ${subSlotsHTML}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>${getCSS()}</style>
      </head>
      <body>
        <div class="export-view">
          <div class="export-header">
            <h1 class="deck-name">${deckName}</h1>
            <p class="date">${formattedDate}</p>
          </div>
          <div class="deck-builder">
            <div class="deck-grid">
              ${characterGroupsHTML}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

const getCSS = (): string => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', sans-serif;
    letter-spacing: 0;
    line-height: 1.5;
  }
  .export-view {
    width: 1700px;
    min-width: 1700px;
    max-width: 1700px;
    zoom: 0.5;
    background: linear-gradient(to bottom right, #f8fafc, #e2e8f0);
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .export-header {
    margin-bottom: 24px;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .deck-name {
    font-size: 36px;
    font-weight: 600;
    color: #475569;
  }
  .date {
    font-size: 20px;
    color: #64748b;
  }
  .deck-builder {
    margin-bottom: 32px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    padding: 24px;
  }
  .deck-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .character-group {
    position: relative;
    padding-left: 24px;
  }
  .badge-area {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 24px;
  }
  .vertical-badge {
    padding: 16px 12px;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    min-width: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    writing-mode: vertical-rl;
    text-orientation: upright;
    color: white;
    font-weight: bold;
    font-size: 18px;
    letter-spacing: 0.05em;
  }
  .center-badge {
    background: linear-gradient(to bottom, #f472b6, #ec4899);
  }
  .singer-badge {
    background: linear-gradient(to bottom, #fbbf24, #f59e0b);
  }
  .card-slots {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px;
    border-radius: 24px;
    backdrop-filter: blur(8px);
    box-shadow: 0 12px 18px -3px rgba(0, 0, 0, 0.1), 0 6px 12px -3px rgba(0, 0, 0, 0.06);
  }
  .character-header {
    text-align: center;
    flex-shrink: 0;
    padding-top: 16px;
  }
  .character-header h3 {
    font-size: 30px;
    font-weight: bold;
    color: #374151;
  }
  .card-slot {
    position: relative;
    width: 100%;
    aspect-ratio: 17 / 11;
    border: 4px solid;
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
  }
  .card-slot.empty {
    border-color: #d1d5db;
    background-color: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-slot.empty .empty-text {
    color: #9ca3af;
    font-size: 24px;
    font-weight: 600;
  }
  .card-slot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .card-no-image {
    width: 100%;
    height: 100%;
    background-color: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 24px;
  }
  .sub-slots-row {
    display: flex;
    gap: 16px;
  }
  .sub-slot { flex: 1; }
  .sub-slot:first-child { max-width: 55%; }
  .ace-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    z-index: 20;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: rgba(156, 163, 175, 0.5);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ace-badge.active { background-color: #fbbf24; }
  .ace-badge::before {
    content: '';
    display: block;
    width: 40px;
    height: 40px;
    background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="%23ffffff" xmlns="http://www.w3.org/2000/svg"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>');
    background-size: contain;
    background-repeat: no-repeat;
  }
  .ace-badge.active::before {
    filter: none;
  }
  .limit-break-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 30;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    font-weight: 900;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    font-variant-numeric: tabular-nums;
    font-size: 84px;
    padding: 4px 16px;
    line-height: 1;
  }
  .limit-break-badge.main {
    font-size: 96px;
    padding: 4px 20px;
    line-height: 1;
  }
  .card-name-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    padding: 12px;
  }
  .card-name-text {
    font-size: 20px;
    font-weight: bold;
    color: white;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  .card-name-text.main { font-size: 30px; }
`;

export class ThumbnailService {
  private storageUtil: StorageUtility;
  private readonly OUTPUT_SCALE = 0.5;
  private readonly BASE_WIDTH = 1700;
  private readonly BASE_HEIGHT = 2000;

  constructor(storageUtil: StorageUtility = new StorageUtility()) {
    this.storageUtil = storageUtil;
  }

  /**
   * デッキサムネイルを生成してStorageに保存
   */
  async generateThumbnail(
    deck: ThumbnailDeck,
    cards: ThumbnailCard[]
  ): Promise<string> {
    const thumbnailBuffer = await this.renderDeckHTML(deck, cards);

    const filename = `${randomUUID()}.png`;
    const tmpPath = `tmp/${filename}`;

    await this.storageUtil.uploadFile(tmpPath, thumbnailBuffer, 'image/png');

    return this.buildTmpStorageUrl(tmpPath);
  }

  private buildTmpStorageUrl(filePath: string): string {
    const bucketName = this.storageUtil.getBucketName();
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      filePath
    )}?alt=media`;
  }

  private async renderDeckHTML(
    deck: ThumbnailDeck,
    cards: ThumbnailCard[]
  ): Promise<Buffer> {
    const html = buildHTML(deck, cards);
    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: Math.ceil(this.BASE_WIDTH * this.OUTPUT_SCALE),
        height: Math.ceil(this.BASE_HEIGHT * this.OUTPUT_SCALE),
        deviceScaleFactor: 1,
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.waitForFunction(
        `Array.from(document.querySelectorAll('img')).every(img => img.complete && img.naturalHeight > 0)`,
        { timeout: 30000 }
      );

      const element = await page.$('.deck-builder');
      if (!element) {
        throw new Error('Deck builder element not found');
      }

      const screenshot = await element.screenshot({
        type: 'png',
        omitBackground: false,
      });

      return screenshot as Buffer;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
