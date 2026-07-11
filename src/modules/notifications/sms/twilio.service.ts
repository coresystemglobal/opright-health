import axios from 'axios';
import { SmsMessage, SmsResult, SmsProvider } from './sms.types';
import { toE164 } from './phone.util';

/**
 * Twilio SMS provider — global fallback.
 * Uses the REST Messages API with HTTP basic auth (AccountSid:AuthToken).
 * https://www.twilio.com/docs/sms/api/message-resource
 */
class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio' as const;

  private get accountSid() { return process.env.TWILIO_ACCOUNT_SID || ''; }
  private get authToken() { return process.env.TWILIO_AUTH_TOKEN || ''; }
  private get fromNumber() { return process.env.TWILIO_FROM_NUMBER || ''; }

  isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.fromNumber);
  }

  async send(msg: SmsMessage): Promise<SmsResult> {
    if (!this.isConfigured()) {
      return { success: false, provider: this.name, error: 'Twilio is not configured' };
    }

    const to = toE164(msg.to);
    if (!to) {
      return { success: false, provider: this.name, error: `Invalid destination number: ${msg.to}` };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: to,
      From: msg.from || this.fromNumber,
      Body: msg.message
    });

    try {
      const { data } = await axios.post<any>(url, body.toString(), {
        auth: { username: this.accountSid, password: this.authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000
      });

      // Twilio returns a queued/sent status; 'failed'/'undelivered' indicate rejection
      const status = data?.status;
      const ok = status !== 'failed' && status !== 'undelivered';

      return {
        success: ok,
        provider: this.name,
        messageId: data?.sid,
        to,
        error: ok ? undefined : `Twilio status: ${status}`,
        raw: data
      };
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || 'Unknown Twilio error';
      return { success: false, provider: this.name, to, error: detail, raw: error?.response?.data };
    }
  }
}

export default new TwilioSmsProvider();
