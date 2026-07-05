import express from 'express';
import { BillingController } from './billing.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPlanLimits, requireFeature } from '@middlewares/billing.middleware';

const billingRouter = express.Router();

billingRouter.get('/plans', BillingController.getPlans);

billingRouter.get('/subscription',
  tenantMiddleware,
  authentication,
  BillingController.getCurrentSubscription
);

billingRouter.post('/subscription',
  tenantMiddleware,
  authentication,
  BillingController.createSubscription
);

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