export interface NotificationPayload {
  title: string;
  body: string;
}

export interface NotificationSender {
  send(payload: NotificationPayload): Promise<void>;
}

export class NotificationService {
  constructor(private sender: NotificationSender) {}

  async notifyDeckReported(params: {
    deckId: string;
    reportedBy: string;
    reason: string;
    details?: string;
  }): Promise<void> {
    await this.sender.send({
      title: 'デッキが通報されました',
      body: this.formatReason(params.reason, params.details, {
        key: 'デッキID',
        value: params.deckId,
        actor: params.reportedBy,
      }),
    });
  }

  async notifyCommentReported(params: {
    deckId: string;
    commentId: string;
    reportedBy: string;
    reason: string;
    details?: string;
  }): Promise<void> {
    await this.sender.send({
      title: 'コメントが通報されました',
      body: this.formatReason(params.reason, params.details, {
        key: 'コメントID',
        value: `${params.commentId}（デッキID: ${params.deckId}）`,
        actor: params.reportedBy,
      }),
    });
  }

  async notifyUserReported(params: {
    userId: string;
    reportedBy: string;
    reason: string;
    details?: string;
  }): Promise<void> {
    await this.sender.send({
      title: 'ユーザーが通報されました',
      body: this.formatReason(params.reason, params.details, {
        key: 'ユーザーID',
        value: params.userId,
        actor: params.reportedBy,
      }),
    });
  }

  async notifyDeckAutoHidden(params: {
    deckId: string;
    distinctReports: number;
  }): Promise<void> {
    await this.sender.send({
      title: 'デッキが自動非表示になりました',
      body: `デッキID: ${params.deckId}\n通報件数(ユニーク): ${params.distinctReports}`,
    });
  }

  async notifyCommentAutoHidden(params: {
    deckId: string;
    commentId: string;
    distinctReports: number;
  }): Promise<void> {
    await this.sender.send({
      title: 'コメントが自動非表示になりました',
      body: `コメントID: ${params.commentId}\nデッキID: ${params.deckId}\n通報件数(ユニーク): ${params.distinctReports}`,
    });
  }

  private formatReason(
    reason: string,
    details: string | undefined,
    info: { key: string; value: string; actor: string }
  ): string {
    const detailPart = details ? `\n詳細: ${details}` : '';
    return `${info.key}: ${info.value}\n通報者: ${info.actor}\n理由: ${reason}${detailPart}`;
  }
}
