import express from 'express';
import { NotificationController } from './notification.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';

const notificationRouter = express.Router();

notificationRouter.get('/',
  tenantMiddleware,
  authentication,
  NotificationController.getNotifications
);

notificationRouter.post('/',
  tenantMiddleware,
  authentication,
  NotificationController.sendNotification
);

export default notificationRouter;