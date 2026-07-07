import { Response } from 'express';
import { notificationManagementService } from '@modules/notifications/notification-management.service';
import { dispatchNotification } from '@modules/notifications/notification-dispatcher.service';
import { PushPlatform } from '@modules/notifications/push-subscription.model';
import { ResponseUtil } from '@utils/response.util';
import { TenantRequest } from '@middlewares/tenant.middleware';
import { PaginationQuery } from '@appTypes/common.types';

export class NotificationController {
  static async getNotifications(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      const { page = '1', limit = '20', unread } = req.query as Record<string, string>;
      const paginationQuery: PaginationQuery = { page, limit };
      const result = await notificationManagementService.list(req.tenant!.id, userId, paginationQuery, unread === 'true');

      return ResponseUtil.paginated(res, result.notifications, result.count, result.page, result.limit, 'Notifications retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getUnreadCount(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const count = await notificationManagementService.unreadCount(req.tenant!.id, userId);
      return ResponseUtil.success(res, { count }, 'Unread count retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async sendNotification(req: TenantRequest, res: Response) {
    try {
      const notification = await dispatchNotification({ ...req.body, tenantId: req.tenant!.id });
      return ResponseUtil.success(res, notification, 'Notification sent successfully', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async markRead(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const notification = await notificationManagementService.markRead(req.params.id, userId);
      return ResponseUtil.success(res, notification, 'Notification marked as read');
    } catch (error: any) {
      if (error.message === 'Notification not found') return ResponseUtil.notFound(res, 'Notification not found');
      if (error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      return ResponseUtil.error(res, error.message);
    }
  }

  static async markAllRead(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const count = await notificationManagementService.markAllRead(req.tenant!.id, userId);
      return ResponseUtil.success(res, { updated: count }, 'All notifications marked as read');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  // ── Device registry ────────────────────────────────────────────────────────

  static async registerDevice(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      const { platform, token, subscription, device_label } = req.body;
      const device = await notificationManagementService.registerDevice({
        userId,
        tenantId: req.tenant!.id,
        platform: platform as PushPlatform,
        token,
        subscription,
        deviceLabel: device_label
      });
      return ResponseUtil.success(res, device, 'Device registered successfully', 201);
    } catch (error: any) {
      if (error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      return ResponseUtil.error(res, error.message);
    }
  }

  static async unregisterDevice(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const removed = await notificationManagementService.unregisterDevice(userId, req.body.token);
      return ResponseUtil.success(res, { removed }, removed ? 'Device unregistered' : 'No matching device found');
    } catch (error: any) {
      if (error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      return ResponseUtil.error(res, error.message);
    }
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  static async getPreferences(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const prefs = await notificationManagementService.getPreferences(userId, req.tenant!.id);
      return ResponseUtil.success(res, prefs, 'Notification preferences retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async updatePreferences(req: TenantRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const prefs = await notificationManagementService.updatePreferences(userId, req.tenant!.id, req.body);
      return ResponseUtil.success(res, prefs, 'Notification preferences updated successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}
