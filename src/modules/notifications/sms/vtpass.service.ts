import axios from 'axios';
import { SmsMessage, SmsResult, SmsProvider } from './sms.types';
import { toE164 } from './phone.util';

/**
 * VTpass SMS provider — primary channel for Nigeria.
 *
 * VTpass authenticates POST requests with `api-key` + `secret-key` headers.
 * The SMS endpoint and payload field names vary by account/product, so the
 * endpoint and sender ID are env-configurable:
 *   VTPASS_BASE_URL      (default https://vtpass.com/api)
 *   VTPASS_SMS_PATH      (default /sms)
 *   VTPASS_API_KEY
 *   VTPASS_SECRET_KEY
 *   VTPASS_SMS_SENDER_ID (default "HMS")
 *
 * VTpass sends the recipient in local Nigerian format (0XXXXXXXXXX), so we
 * denormalize the E.164 number back to national form for the +234 case.
 */
class VtpassSmsProvider implements SmsProvider {
  readonly name = 'vtpass' as const;

  private get baseUrl() { return process.env.VTPASS_BASE_URL || 'https://vtpass.com/api'; }
  private get smsPath() { return process.env.VTPASS_SMS_PATH || '/sms'; }
  private get apiKey() { return process.env.VTPASS_API_KEY || ''; }
  private get secretKey() { return process.env.VTPASS_SECRET_KEY || ''; }
  private get senderId() { return process.env.VTPASS_SMS_SENDER_ID || 'HMS'; }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.secretKey);
  }

  /** VTpass expects Nigerian numbers in local 0-prefixed form. */
  private toLocalNg(e164: string): string {
    if (e164.startsWith('+234')) return '0' + e164.slice(4);
    if (e164.startsWith('+')) return e164.slice(1);
    return e164;
  }

  async send(msg: SmsMessage): Promise<SmsResult> {
    if (!this.isConfigured()) {
      return { success: false, provider: this.name, error: 'VTpass is not configured' };
    }

    const e164 = toE164(msg.to);
    if (!e164) {
      return { success: false, provider: this.name, error: `Invalid destination number: ${msg.to}` };
    }

    const url = `${this.baseUrl}${this.smsPath}`;
    const payload = {
      sender: msg.from || this.senderId,
      recipient: this.toLocalNg(e164),
      message: msg.message
    };

    try {
      const { data } = await axios.post<any>(url, payload, {
        headers: {
          'api-key': this.apiKey,
          'secret-key': this.secretKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      // VTpass uses code "000" for success on most products
      const code = data?.code ?? data?.response_description;
      const ok = code === '000' || data?.status === 'success' || data?.success === true;

      return {
        success: Boolean(ok),
        provider: this.name,
        messageId: data?.requestId || data?.message_id || data?.reference,
        to: e164,
        error: ok ? undefined : (data?.response_description || data?.message || 'VTpass rejected the message'),
        raw: data
      };
    } catch (error: any) {
      const detail = error?.response?.data?.response_description
        || error?.response?.data?.message
        || error?.message
        || 'Unknown VTpass error';
      return { success: false, provider: this.name, to: e164, error: detail, raw: error?.response?.data };
    }
  }
}

export default new VtpassSmsProvider();
