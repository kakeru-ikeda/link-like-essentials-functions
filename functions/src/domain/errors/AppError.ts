export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'リソースが見つかりません') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '認証が必要です') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = '入力値が不正です',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public details?: any
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '権限がありません') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'リソースが既に存在します') {
    super(message, 'CONFLICT', 409);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'サーバーエラーが発生しました') {
    super(message, 'INTERNAL_SERVER_ERROR', 500);
  }
}
