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

billingRouter.post('/downgrade',
  tenantMiddleware,
  authentication,
  BillingController.downgradePlan
);

billingRouter.post('/cancel',
  tenantMiddleware,
  authentication,
  BillingController.cancelSubscription
);

billingRouter.post('/reactivate',
  tenantMiddleware,
  authentication,
  BillingController.reactivateSubscription
);

billingRouter.get('/history',
  tenantMiddleware,
  authentication,
  BillingController.getHistory
);

billingRouter.get('/usage',
  tenantMiddleware,
  authentication,
  BillingController.getUsage
);

// Paystack subscription webhook — public, signature-verified, no tenant middleware.
billingRouter.post('/webhook', BillingController.handleWebhook);

export default billingRouter;