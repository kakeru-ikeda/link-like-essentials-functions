import type {
  NotificationPayload,
  NotificationSender,
} from '@/application/services/NotificationService';

export class DiscordNotifier implements NotificationSender {
  private webhookUrl: string;

  constructor(webhookUrl = process.env.DISCORD_REPORT_WEBHOOK_URL || '') {
    this.webhookUrl = webhookUrl;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.webhookUrl) {
      // Webhook URL 未設定時は何もしない
      return;
    }

    const content = `**${payload.title}**\n${payload.body}`;

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }
}
