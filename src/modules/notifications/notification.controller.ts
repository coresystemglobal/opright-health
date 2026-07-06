import { Response } from 'express';
import { NotificationService } from '@modules/notifications/notification.service';

import { ResponseUtil } from '@utils/response.util';
import { TenantRequest } from '@middlewares/tenant.middleware';

export class NotificationController {
  static async getNotifications(req: TenantRequest, res: Response) {
    try {
      const notifications = NotificationService.getNotifications(
        req.tenant!.id,
        req.user?.userId
      );
      return ResponseUtil.success(res, notifications, 'Notifications retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async sendNotification(req: TenantRequest, res: Response) {
    try {
      const notification = await NotificationService.sendNotification({
        ...req.body,
        tenantId: req.tenant!.id
      });
      return ResponseUtil.success(res, notification, 'Notification sent successfully', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}