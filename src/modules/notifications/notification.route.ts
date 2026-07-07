import express from 'express';
import { NotificationController } from './notification.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateQuery, validateParams, notificationValidation, genericValidation } from '@utils/validator';

const notificationRouter = express.Router();

// List the caller's notifications (own + tenant-wide)
notificationRouter.get('/',
  tenantMiddleware,
  authentication,
  validateQuery(notificationValidation.list),
  NotificationController.getNotifications
);

notificationRouter.get('/unread-count',
  tenantMiddleware,
  authentication,
  NotificationController.getUnreadCount
);

// Send a notification (dispatches across channels)
notificationRouter.post('/',
  tenantMiddleware,
  authentication,
  validate(notificationValidation.send),
  NotificationController.sendNotification
);

// Preferences
notificationRouter.get('/preferences',
  tenantMiddleware,
  authentication,
  NotificationController.getPreferences
);

notificationRouter.patch('/preferences',
  tenantMiddleware,
  authentication,
  validate(notificationValidation.updatePreferences),
  NotificationController.updatePreferences
);

// Device registry (push)
notificationRouter.post('/devices',
  tenantMiddleware,
  authentication,
  validate(notificationValidation.registerDevice),
  NotificationController.registerDevice
);

notificationRouter.delete('/devices',
  tenantMiddleware,
  authentication,
  validate(notificationValidation.unregisterDevice),
  NotificationController.unregisterDevice
);

// Mark read
notificationRouter.patch('/read-all',
  tenantMiddleware,
  authentication,
  NotificationController.markAllRead
);

notificationRouter.patch('/:id/read',
  tenantMiddleware,
  authentication,
  validateParams(genericValidation.id),
  NotificationController.markRead
);

export default notificationRouter;
