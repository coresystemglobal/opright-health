import vtpassProvider from './vtpass.service';
import twilioProvider from './twilio.service';
import { SmsMessage, SmsResult, SmsProvider } from './sms.types';
import { toE164 } from './phone.util';

/**
 * SMS orchestration.
 *
 * Strategy (per the recorded decision): VTpass is the primary channel for
 * Nigeria, Twilio the global fallback. On send we try the configured
 * primary first; if it is unconfigured OR the send fails, we fall back to
 * the secondary provider. The order can be flipped with SMS_PRIMARY_PROVIDER.
 */

const providers: Record<string, SmsProvider> = {
  vtpass: vtpassProvider,
  twilio: twilioProvider
};

function orderedProviders(): SmsProvider[] {
  const primary = (process.env.SMS_PRIMARY_PROVIDER || 'vtpass').toLowerCase();
  const secondary = primary === 'twilio' ? 'vtpass' : 'twilio';
  return [providers[primary], providers[secondary]].filter(Boolean);
}

/**
 * Send a single SMS, trying the primary provider then falling back.
 * Never throws — always resolves to an SmsResult describing the outcome.
 */
export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  if (!msg?.to || !msg?.message?.trim()) {
    return { success: false, provider: null, error: 'Both "to" and a non-empty "message" are required' };
  }

  if (!toE164(msg.to)) {
    return { success: false, provider: null, error: `Invalid destination number: ${msg.to}` };
  }

  const chain = orderedProviders();
  const configured = chain.filter(p => p.isConfigured());

  if (configured.length === 0) {
    return { success: false, provider: null, error: 'No SMS provider is configured' };
  }

  let lastError: string | undefined;
  for (const provider of configured) {
    const result = await provider.send(msg);
    if (result.success) return result;
    lastError = `${provider.name}: ${result.error}`;
    console.warn(`SMS via ${provider.name} failed, trying next provider. ${result.error}`);
  }

  return { success: false, provider: null, error: lastError || 'All SMS providers failed' };
}

/**
 * Fan out the same message to many recipients. Runs sequentially to stay
 * within provider rate limits; returns a per-recipient result array.
 */
export async function sendBulkSms(recipients: string[], message: string, from?: string): Promise<SmsResult[]> {
  const results: SmsResult[] = [];
  for (const to of recipients) {
    results.push(await sendSms({ to, message, from }));
  }
  return results;
}

/** True when at least one provider has credentials configured. */
export function isSmsEnabled(): boolean {
  return orderedProviders().some(p => p.isConfigured());
}
