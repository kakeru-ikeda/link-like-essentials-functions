import type {
  DeckComment,
  DeckPublicationRequest,
  GetDecksParams,
  PageInfo,
  PublishedDeck,
} from '@/domain/entities/Deck';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/AppError';
import type { IDeckRepository } from '@/domain/repositories/IDeckRepository';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';

export class DeckService {
  constructor(
    private deckRepository: IDeckRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * デッキを公開
   */
  async publishDeck(
    request: DeckPublicationRequest,
    userId: string
  ): Promise<PublishedDeck> {
    // ユーザー情報取得
    const user = await this.userRepository.findByUid(userId);
    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    // バリデーション
    this.validatePublishRequest(request);

    // 公開処理
    return await this.deckRepository.publishDeck(
      request,
      userId,
      user.displayName
    );
  }

  /**
   * デッキ一覧を取得
   */
  async getPublishedDecks(
    params: GetDecksParams
  ): Promise<{ decks: PublishedDeck[]; pageInfo: PageInfo }> {
    return await this.deckRepository.findPublishedDecks(params);
  }

  /**
   * デッキ詳細を取得
   */
  async getPublishedDeckById(id: string): Promise<PublishedDeck> {
    const deck = await this.deckRepository.findPublishedDeckById(id);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }
    return deck;
  }

  /**
   * デッキを削除
   */
  async deleteDeck(id: string, userId: string): Promise<void> {
    const deck = await this.deckRepository.findPublishedDeckById(id);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    if (deck.userId !== userId) {
      throw new ForbiddenError('このデッキを削除する権限がありません');
    }

    await this.deckRepository.deleteDeck(id, userId);
  }

  /**
   * いいねを追加
   */
  async addLike(deckId: string, userId: string): Promise<number> {
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    return await this.deckRepository.addLike(deckId, userId);
  }

  /**
   * いいねを削除
   */
  async removeLike(deckId: string, userId: string): Promise<number> {
    return await this.deckRepository.removeLike(deckId, userId);
  }

  /**
   * 閲覧数をカウント
   */
  async incrementViewCount(deckId: string, userId: string): Promise<number> {
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    return await this.deckRepository.incrementViewCount(deckId, userId);
  }

  /**
   * コメントを追加
   */
  async addComment(
    deckId: string,
    userId: string,
    text: string
  ): Promise<DeckComment> {
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    const user = await this.userRepository.findByUid(userId);
    if (!user) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    return await this.deckRepository.addComment(
      deckId,
      userId,
      user.displayName,
      text
    );
  }

  /**
   * デッキを通報
   */
  async reportDeck(
    deckId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    const deck = await this.deckRepository.findPublishedDeckById(deckId);
    if (!deck) {
      throw new NotFoundError('指定されたデッキが見つかりません');
    }

    await this.deckRepository.reportDeck(deckId, userId, reason, details);
  }

  /**
   * デッキ公開リクエストのバリデーション
   */
  private validatePublishRequest(request: DeckPublicationRequest): void {
    // ID形式チェック（nanoid 21文字）
    if (!request.id || request.id.length !== 21) {
      throw new ValidationError('公開IDの形式が不正です');
    }

    // デッキ名チェック
    if (!request.deck.name || request.deck.name.length > 255) {
      throw new ValidationError(
        'デッキ名は1文字以上255文字以下で入力してください'
      );
    }

    // スロット数チェック
    if (request.deck.slots.length !== 18) {
      throw new ValidationError('デッキのスロット数は18個である必要があります');
    }

    // コメント長チェック
    if (request.comment && request.comment.length > 1000) {
      throw new ValidationError('コメントは1000文字以下で入力してください');
    }

    // 画像枚数チェック
    if (request.imageUrls && request.imageUrls.length > 3) {
      throw new ValidationError('画像は最大3枚までアップロードできます');
    }
  }
}
