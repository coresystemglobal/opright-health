export interface SmsMessage {
  /** Destination phone number (any format; normalized to E.164 before send). */
  to: string;
  /** Message body. */
  message: string;
  /** Optional sender ID / from-number override. */
  from?: string;
}

export interface SmsResult {
  success: boolean;
  provider: 'vtpass' | 'twilio' | null;
  /** Provider-side message/reference id when available. */
  messageId?: string;
  /** Normalized destination that was actually dialed. */
  to?: string;
  error?: string;
  /** Raw provider response, for logging/debugging. */
  raw?: any;
}

export interface SmsProvider {
  readonly name: 'vtpass' | 'twilio';
  isConfigured(): boolean;
  send(msg: SmsMessage): Promise<SmsResult>;
}
