import express from 'express';
import { BillingController } from '../controllers/billing.controller';
import authentication from '../middlewares/authentication';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { checkPlanLimits, requireFeature } from '../middlewares/billing.middleware';

const billingRouter = express.Router();

/**
 * @swagger
 * /api/billing/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Available plans with pricing and limits
 */
billingRouter.get('/plans', BillingController.getPlans);

/**
 * @swagger
 * /api/billing/subscription:
 *   get:
 *     summary: Get current subscription details
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription and usage details
 */
billingRouter.get('/subscription',
  tenantMiddleware,
  authentication,
  BillingController.getCurrentSubscription
);

/**
 * @swagger
 * /api/billing/subscription:
 *   post:
 *     summary: Create new subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [basic, standard, pro]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *     responses:
 *       201:
 *         description: Subscription created successfully
 */
billingRouter.post('/subscription',
  tenantMiddleware,
  authentication,
  BillingController.createSubscription
);

/**
 * @swagger
 * /api/billing/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [basic, standard, pro]
 *     responses:
 *       200:
 *         description: Plan upgraded successfully
 */
billingRouter.post('/upgrade',
  tenantMiddleware,
  authentication,
  BillingController.upgradePlan
);

billingRouter.get('/usage',
  tenantMiddleware,
  authentication,
  BillingController.getUsage
);

billingRouter.post('/webhook', BillingController.handleWebhook);

export default billingRouter;