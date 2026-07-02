import axios from 'axios';

interface SlackErrorPayload {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  tenantId?: string;
  url?: string;
  method?: string;
  ip?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#36a64f',
  medium: '#ff9900',
  high: '#ff6600',
  critical: '#cc0000',
};

const SEVERITY_EMOJI: Record<string, string> = {
  low: ':white_circle:',
  medium: ':large_yellow_circle:',
  high: ':large_orange_circle:',
  critical: ':red_circle:',
};

export class SlackService {
  private static webhookUrl = process.env.SLACK_WEBHOOK_URL;

  static async sendErrorAlert(error: SlackErrorPayload): Promise<void> {
    if (!this.webhookUrl) return;

    const env = process.env.NODE_ENV || 'development';
    const color = SEVERITY_COLORS[error.severity];
    const emoji = SEVERITY_EMOJI[error.severity];

    const payload = {
      text: `${emoji} *[${error.severity.toUpperCase()}] Error in HMS — ${env}*`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Error', value: error.message, short: false },
            { title: 'Endpoint', value: `${error.method || '-'} ${error.url || '-'}`, short: true },
            { title: 'Time', value: error.timestamp, short: true },
            { title: 'Error ID', value: error.id, short: true },
            ...(error.userId ? [{ title: 'User ID', value: error.userId, short: true }] : []),
            ...(error.tenantId ? [{ title: 'Tenant ID', value: error.tenantId, short: true }] : []),
            ...(error.ip ? [{ title: 'IP', value: error.ip, short: true }] : []),
            ...(error.stack
              ? [{ title: 'Stack Trace', value: `\`\`\`${error.stack.slice(0, 500)}\`\`\``, short: false }]
              : []),
          ],
          footer: 'HMS Error Tracking',
          ts: Math.floor(new Date(error.timestamp).getTime() / 1000),
        },
      ],
    };

    try {
      await axios.post(this.webhookUrl, payload, { timeout: 5000 });
    } catch {
      // Swallow — Slack delivery failure must never crash the app
      console.error('[SlackService] Failed to deliver error alert to Slack');
    }
  }
}
