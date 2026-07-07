import webpush from 'web-push';
import { PushPayload, PushSendResult } from './fcm.service';

/**
 * VAPID Web Push provider — browser push for staff (web app).
 *
 * Config: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or URL).
 * Generate a keypair once with `npx web-push generate-vapid-keys`. Absent
 * config => not configured, sends no-op gracefully.
 *
 * `token` for a web subscription is its endpoint; `subscription` is the full
 * PushSubscription JSON the browser produced.
 */
class WebPushProvider {
  private configured = false;
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (pub && priv) {
      try {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@hospital-management.com', pub, priv);
        this.configured = true;
      } catch (err) {
        console.error('web-push VAPID setup failed:', err);
        this.configured = false;
      }
    }
  }

  isConfigured(): boolean {
    this.init();
    return this.configured;
  }

  /**
   * @param subs list of { token(endpoint), subscription } pairs
   */
  async send(subs: Array<{ token: string; subscription: any }>, payload: PushPayload): Promise<PushSendResult> {
    const result: PushSendResult = { successCount: 0, failureCount: 0, invalidTokens: [] };
    if (subs.length === 0) return result;

    this.init();
    if (!this.configured) return { ...result, failureCount: subs.length };

    const body = JSON.stringify({ title: payload.title, body: payload.body, data: payload.data || {} });

    await Promise.all(subs.map(async ({ token, subscription }) => {
      try {
        await webpush.sendNotification(subscription, body);
        result.successCount++;
      } catch (err: any) {
        result.failureCount++;
        // 404/410 => subscription expired or unsubscribed; prune it
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          result.invalidTokens.push(token);
        }
      }
    }));

    return result;
  }
}

export default new WebPushProvider();
