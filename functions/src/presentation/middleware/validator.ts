import { z } from 'zod';

const DeckSlotSchema = z.object({
  slotId: z.number().int().min(0).max(17),
  cardId: z.string().nullable(),
  limitBreak: z.number().int().min(1).max(14).optional(),
});

export const DeckCreateSchema = z.object({
  deck: z.object({
    id: z.string().uuid(),
    userId: z.string(),
    name: z.string().min(1).max(100),
    slots: z.array(DeckSlotSchema).length(18),
    aceSlotId: z.number().int().min(0).max(17).nullable(),
    deckType: z.string().optional(),
    songId: z.string().optional(),
    memo: z.string().max(1000).optional(),
  }),
});

export const DeckUpdateSchema = z.object({
  deck: z.object({
    name: z.string().min(1).max(100).optional(),
    slots: z.array(DeckSlotSchema).length(18).optional(),
    aceSlotId: z.number().int().min(0).max(17).nullable().optional(),
    deckType: z.string().optional(),
    songId: z.string().optional(),
    memo: z.string().max(1000).optional(),
  }),
});

export const DeckQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt', 'viewCount']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  userId: z.string().optional(),
  songId: z.string().optional(),
  tag: z.string().optional(),
});

// User関連のバリデーションスキーマ
export const UserCreateSchema = z.object({
  username: z.string().min(1).max(50),
});

export const UserUpdateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
});
