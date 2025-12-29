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
const tmpAvatarUrlSchema = z
  .string()
  .url()
  .refine((url) => url.includes('/tmp%2F') || url.includes('/tmp/'), {
    message: 'avatarUrlは/tmpディレクトリのStorage URLである必要があります',
  })
  .refine(
    (url) =>
      /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/.+/.test(
        url
      ),
    {
      message: '無効なStorage URLです',
    }
  );

export const UserCreateSchema = z.object({
  llid: z.string().length(9).optional(),
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: tmpAvatarUrlSchema.optional(),
});

export const UserUpdateSchema = z.object({
  llid: z.string().length(9).optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: tmpAvatarUrlSchema.optional(),
});

// デッキ公開API用のバリデーションスキーマ

// デッキスロットスキーマ（公開用）
const DeckSlotForCloudSchema = z.object({
  slotId: z.number().int().min(0).max(17),
  cardId: z.string().nullable(),
  limitBreak: z.number().int().min(0).max(5).optional(),
});

// デッキ基本情報スキーマ（公開用）
const DeckForCloudSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  slots: z.array(DeckSlotForCloudSchema).length(18),
  aceSlotId: z.number().int().min(0).max(17).nullable(),
  deckType: z.string().optional(),
  songId: z.string().optional(),
  liveGrandPrixId: z.string().optional(),
  liveGrandPrixDetailId: z.string().optional(),
  score: z.number().optional(),
  memo: z.string().optional(),
});

// デッキ公開リクエストスキーマ
export const DeckPublishSchema = z.object({
  id: z.string().length(21),
  deck: DeckForCloudSchema,
  comment: z.string().max(1000).optional(),
  hashtags: z.array(z.string()),
  imageUrls: z.array(z.string().url()).max(3).optional(),
});

// コメント追加スキーマ
export const DeckCommentSchema = z.object({
  text: z.string().min(1).max(500),
});

// 通報スキーマ
export const DeckReportSchema = z.object({
  reason: z.enum(['inappropriate_content', 'spam', 'copyright', 'other']),
  details: z.string().max(1000).optional(),
});

// クエリパラメータスキーマ
export const GetDecksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  orderBy: z.enum(['publishedAt', 'viewCount', 'likeCount']).optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  userId: z.string().optional(),
  songId: z.string().optional(),
  tag: z.string().optional(),
  keyword: z.string().optional(),
});
