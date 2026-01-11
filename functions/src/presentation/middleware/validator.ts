import { z } from 'zod';

const createTmpStorageUrlSchema = (label: string): z.ZodType<string> =>
  z
    .string()
    .url()
    .refine((url) => url.includes('/tmp%2F') || url.includes('/tmp/'), {
      message: `${label}は/tmpディレクトリのStorage URLである必要があります`,
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

// User関連のバリデーションスキーマ
const tmpAvatarUrlSchema = createTmpStorageUrlSchema('avatarUrl');

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

export const UserBatchQuerySchema = z.object({
  userIds: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
    .refine((ids) => ids.length > 0, {
      message: 'userIdsは1件以上指定してください',
    })
    .refine((ids) => ids.length <= 50, {
      message: 'userIdsは最大50件まで指定できます',
    }),
});

export const AuthUpgradeEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50).optional(),
});

// デッキ公開API用のバリデーションスキーマ

// デッキスロットスキーマ（公開用）
const DeckSlotForCloudSchema = z.object({
  slotId: z.number().int().min(0).max(99),
  cardId: z.string().nullable(),
  limitBreak: z.number().int().min(0).max(14).optional(),
});

// デッキ基本情報スキーマ（公開用）
const DeckForCloudSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  slots: z.array(DeckSlotForCloudSchema).length(19),
  aceSlotId: z.number().int().min(0).max(17).nullable(),
  deckType: z.string().optional(),
  songId: z.string().optional(),
  liveGrandPrixId: z.string().optional(),
  liveGrandPrixDetailId: z.string().optional(),
  score: z.number().optional(),
  memo: z.string().optional(),
});

// tmp 配下のデッキ画像/サムネイル URL 用スキーマ
const tmpDeckAssetUrlSchema = createTmpStorageUrlSchema('画像URL');

// デッキ公開リクエストスキーマ
export const DeckPublishSchema = z.object({
  id: z.string().length(21),
  deck: DeckForCloudSchema,
  comment: z.string().max(1000).optional(),
  hashtags: z.array(z.string()),
  imageUrls: z.array(tmpDeckAssetUrlSchema).max(3).optional(),
  thumbnail: tmpDeckAssetUrlSchema.optional(),
  isUnlisted: z.boolean().optional().default(false),
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
});

export const GetMyDecksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  orderBy: z.enum(['publishedAt', 'viewCount', 'likeCount']).optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  songId: z.string().optional(),
  tag: z.string().optional(),
});

export const GetLikedDecksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const GetCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
});
