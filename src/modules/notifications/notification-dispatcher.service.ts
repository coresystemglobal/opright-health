import { Op } from 'sequelize';
import { Notification, PushSubscription, NotificationPreference, User } from '../../models';
import { NotificationType, NotificationChannel } from '@modules/notifications/notification.model';
import { PushPlatform } from '@modules/notifications/push-subscription.model';
import { DEFAULT_CHANNEL_PREFERENCES } from '@modules/notifications/notification-preference.model';
import type { ChannelPreferences } from '@modules/notifications/notification-preference.model';
import { NotificationService } from '@modules/notifications/notification.service';
import fcmProvider from '@modules/notifications/push/fcm.service';
import webPushProvider from '@modules/notifications/push/webpush.service';
import { sendSms } from '@modules/notifications/sms/sms.service';
import sendEmail from '@shared/email/email.service';

export interface DispatchInput {
  tenantId: string;
  /** Target user; omit for a tenant-wide broadcast (in-app only). */
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  /**
   * Channels this event wants to use. Intersected with the user's
   * preferences. Omit to use every channel the user permits.
   */
  channels?: NotificationChannel[];
  /** Explicit contact overrides (else resolved from the user record). */
  email?: string;
  phone?: string;
}

const ALL_CHANNELS = [
  NotificationChannel.IN_APP,
  NotificationChannel.PUSH,
  NotificationChannel.EMAIL,
  NotificationChannel.SMS
];

/**
 * Resolve a user's effective channel prefs, applying per-type overrides.
 */
async function resolveChannels(userId: string, type: NotificationType): Promise<Required<ChannelPreferences>> {
  const pref = await NotificationPreference.findOne({ where: { user_id: userId } }).catch(() => null);
  if (!pref) return { ...DEFAULT_CHANNEL_PREFERENCES };

  const base = pref.effective_channels;
  const override = pref.overrides?.[type];
  if (!override) return base;

  return {
    in_app: override.in_app ?? base.in_app,
    push: override.push ?? base.push,
    email: override.email ?? base.email,
    sms: override.sms ?? base.sms
  };
}

/** Prune push tokens the providers reported as permanently invalid. */
async function pruneTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await PushSubscription.destroy({ where: { token: { [Op.in]: tokens } } }).catch(() => null);
}

async function deliverPush(userId: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
  const subs = await PushSubscription.findAll({ where: { user_id: userId } }).catch(() => []);
  if (subs.length === 0) return false;

  // FCM data payloads must be string→string
  const stringData: Record<string, string> = {};
  if (data) for (const [k, v] of Object.entries(data)) stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);

  const fcmTokens = subs.filter(s => s.platform === PushPlatform.FCM).map(s => s.token);
  const webSubs = subs
    .filter(s => s.platform === PushPlatform.WEB && s.subscription)
    .map(s => ({ token: s.token, subscription: s.subscription }));

  let delivered = false;
  const invalid: string[] = [];

  if (fcmTokens.length && fcmProvider.isConfigured()) {
    const r = await fcmProvider.send(fcmTokens, { title, body, data: stringData });
    delivered = delivered || r.successCount > 0;
    invalid.push(...r.invalidTokens);
  }
  if (webSubs.length && webPushProvider.isConfigured()) {
    const r = await webPushProvider.send(webSubs, { title, body, data: stringData });
    delivered = delivered || r.successCount > 0;
    invalid.push(...r.invalidTokens);
  }

  await pruneTokens(invalid);
  return delivered;
}

/**
 * Persist a notification and fan it out across the recipient's enabled
 * channels. Always records the notification row (the source of truth /
 * history); channel delivery is best-effort and non-fatal.
 */
export async function dispatchNotification(input: DispatchInput): Promise<Notification> {
  const { tenantId, userId, type, title, message, data } = input;

  // Which channels does this event want?
  const requested = input.channels && input.channels.length > 0 ? input.channels : ALL_CHANNELS;

  // Intersect with user preferences (broadcasts have no user prefs → in-app only)
  let enabled = new Set<NotificationChannel>();
  if (userId) {
    const prefs = await resolveChannels(userId, type);
    if (prefs.in_app) enabled.add(NotificationChannel.IN_APP);
    if (prefs.push) enabled.add(NotificationChannel.PUSH);
    if (prefs.email) enabled.add(NotificationChannel.EMAIL);
    if (prefs.sms) enabled.add(NotificationChannel.SMS);
  } else {
    enabled.add(NotificationChannel.IN_APP);
  }
  const channels = requested.filter(c => enabled.has(c));

  const delivered: string[] = [];

  // In-app (real-time socket) — always also persisted below
  if (channels.includes(NotificationChannel.IN_APP)) {
    const event = { type, title, message, data, tenantId, userId, timestamp: new Date().toISOString() };
    if (userId) NotificationService.emitToUser(userId, event);
    else NotificationService.emitToTenant(tenantId, event);
    delivered.push(NotificationChannel.IN_APP);
  }

  // Resolve contact info if any contact channel is in play
  let email = input.email;
  let phone = input.phone;
  if (userId && (channels.includes(NotificationChannel.EMAIL) || channels.includes(NotificationChannel.SMS))) {
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'phone'] }).catch(() => null);
    email = email || user?.email;
    phone = phone || user?.phone || undefined;
  }

  // Push
  if (userId && channels.includes(NotificationChannel.PUSH)) {
    const ok = await deliverPush(userId, title, message, data).catch(() => false);
    if (ok) delivered.push(NotificationChannel.PUSH);
  }

  // Email
  if (email && channels.includes(NotificationChannel.EMAIL)) {
    const ok = await sendEmail({ to: email, subject: title, text: message }).catch(() => false);
    if (ok) delivered.push(NotificationChannel.EMAIL);
  }

  // SMS
  if (phone && channels.includes(NotificationChannel.SMS)) {
    const r = await sendSms({ to: phone, message: `${title}: ${message}` }).catch(() => null);
    if (r?.success) delivered.push(NotificationChannel.SMS);
  }

  // Persist the record (history + read state)
  const record = await Notification.create({
    tenant_id: tenantId,
    user_id: userId || null,
    type,
    title,
    message,
    data: data || null,
    delivered_channels: delivered,
    is_read: false
  } as any);

  return record;
}
