import { Op } from 'sequelize';
import { Notification, PushSubscription, NotificationPreference } from '../../models';
import { PushPlatform } from '@modules/notifications/push-subscription.model';
import type { ChannelPreferences } from '@modules/notifications/notification-preference.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

export const notificationManagementService = {
  /** A user's notifications: their own plus tenant-wide (user_id null). */
  list: async (tenantId: string, userId: string, paginationQuery: PaginationQuery, unreadOnly = false) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = {
      tenant_id: tenantId,
      [Op.or]: [{ user_id: userId }, { user_id: null }]
    };
    if (unreadOnly) where.is_read = false;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions)
    });

    return { notifications: rows, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  unreadCount: async (tenantId: string, userId: string): Promise<number> => {
    return Notification.count({
      where: { tenant_id: tenantId, is_read: false, [Op.or]: [{ user_id: userId }, { user_id: null }] }
    });
  },

  markRead: async (notificationId: string, userId: string) => {
    if (!ValidationUtil.isValidUUID(notificationId)) throw new Error('Invalid notification ID format');
    const notification = await Notification.findByPk(notificationId);
    if (!notification) throw new Error('Notification not found');
    // Only the owner (or a tenant-wide notification) may be marked read by the user
    if (notification.user_id && notification.user_id !== userId) throw new Error('Notification not found');

    if (!notification.is_read) await notification.update({ is_read: true, read_at: new Date() });
    return notification;
  },

  markAllRead: async (tenantId: string, userId: string): Promise<number> => {
    const [affected] = await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { tenant_id: tenantId, is_read: false, [Op.or]: [{ user_id: userId }, { user_id: null }] } }
    );
    return affected;
  },

  // ── Device registry ────────────────────────────────────────────────────────

  registerDevice: async (params: {
    userId: string;
    tenantId: string;
    platform: PushPlatform;
    token: string;
    subscription?: Record<string, any>;
    deviceLabel?: string;
  }) => {
    const { userId, tenantId, platform, token, subscription, deviceLabel } = params;
    if (!token) throw new Error('token (FCM token or web-push endpoint) is required');
    if (platform === PushPlatform.WEB && !subscription) {
      throw new Error('subscription is required for web push registration');
    }

    // Upsert by token so re-registering the same device is idempotent
    const existing = await PushSubscription.findOne({ where: { token } });
    if (existing) {
      await existing.update({ user_id: userId, tenant_id: tenantId, platform, subscription: subscription || null, device_label: deviceLabel || existing.device_label });
      return existing;
    }

    return PushSubscription.create({
      user_id: userId,
      tenant_id: tenantId,
      platform,
      token,
      subscription: subscription || null,
      device_label: deviceLabel || null
    } as any);
  },

  unregisterDevice: async (userId: string, token: string): Promise<boolean> => {
    if (!token) throw new Error('token is required');
    const deleted = await PushSubscription.destroy({ where: { user_id: userId, token } });
    return deleted > 0;
  },

  // ── Preferences ──────────────────────────────────────────────────────────

  getPreferences: async (userId: string, tenantId: string) => {
    let pref = await NotificationPreference.findOne({ where: { user_id: userId } });
    if (!pref) {
      pref = await NotificationPreference.create({ user_id: userId, tenant_id: tenantId } as any);
    }
    return { channels: pref.effective_channels, overrides: pref.overrides || {} };
  },

  updatePreferences: async (userId: string, tenantId: string, update: { channels?: ChannelPreferences; overrides?: Record<string, ChannelPreferences> }) => {
    let pref = await NotificationPreference.findOne({ where: { user_id: userId } });
    if (!pref) {
      pref = await NotificationPreference.create({ user_id: userId, tenant_id: tenantId } as any);
    }

    const merged: any = {};
    if (update.channels) merged.channels = { ...(pref.channels || {}), ...update.channels };
    if (update.overrides) merged.overrides = { ...(pref.overrides || {}), ...update.overrides };

    await pref.update(merged);
    return { channels: pref.effective_channels, overrides: pref.overrides || {} };
  }
};
