import { initializeApp, cert, applicationDefault, App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  successCount: number;
  failureCount: number;
  /** Tokens the provider reported as permanently invalid — caller should prune. */
  invalidTokens: string[];
}

/**
 * Firebase Cloud Messaging provider — mobile push (patient app).
 *
 * Credentials come from FCM_SERVICE_ACCOUNT (a JSON string) or the standard
 * GOOGLE_APPLICATION_CREDENTIALS file path. Absent config => not configured,
 * and all sends no-op gracefully.
 */
class FcmProvider {
  private app: App | null = null;
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const raw = process.env.FCM_SERVICE_ACCOUNT;
      if (raw) {
        this.app = initializeApp({ credential: cert(JSON.parse(raw) as ServiceAccount) }, 'hms-fcm');
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.app = initializeApp({ credential: applicationDefault() }, 'hms-fcm');
      }
    } catch (err) {
      console.error('FCM init failed:', err);
      this.app = null;
    }
  }

  isConfigured(): boolean {
    this.init();
    return this.app !== null;
  }

  async send(tokens: string[], payload: PushPayload): Promise<PushSendResult> {
    const empty: PushSendResult = { successCount: 0, failureCount: 0, invalidTokens: [] };
    if (tokens.length === 0) return empty;

    this.init();
    if (!this.app) return { ...empty, failureCount: tokens.length };

    try {
      const res = await getMessaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {}
      });

      const invalidTokens: string[] = [];
      res.responses.forEach((r: SendResponse, i: number) => {
        if (!r.success) {
          const code = r.error?.code || '';
          if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
            invalidTokens.push(tokens[i]);
          }
        }
      });

      return { successCount: res.successCount, failureCount: res.failureCount, invalidTokens };
    } catch (err) {
      console.error('FCM send failed:', err);
      return { ...empty, failureCount: tokens.length };
    }
  }
}

export default new FcmProvider();
