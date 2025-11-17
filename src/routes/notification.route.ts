import express from 'express';
import { NotificationController } from '../controllers/notification.controller';
import authentication from '../middlewares/authentication';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const notificationRouter = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
notificationRouter.get('/', 
  tenantMiddleware,
  authentication,
  NotificationController.getNotifications
);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Send notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification sent successfully
 */
notificationRouter.post('/',
  tenantMiddleware,
  authentication,
  NotificationController.sendNotification
);

export default notificationRouter;