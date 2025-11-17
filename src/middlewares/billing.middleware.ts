import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service';
import { TenantRequest } from './tenant.middleware';

export const checkPlanLimits = (feature?: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant required' });
      }

      const { withinLimits, violations } = await BillingService.checkUsageLimits(req.tenant.id);

      if (!withinLimits) {
        return res.status(402).json({
          message: 'Usage limits exceeded',
          violations,
          upgradeRequired: true
        });
      }

      // Track API usage
      await BillingService.trackUsage(req.tenant.id, 'api_calls_count');

      return next();
    } catch (error) {
      return next();
    }
  };
};

export const requireFeature = (feature: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant required' });
      }

      const subscription = await BillingService.getCurrentSubscription(req.tenant.id);
      if (!subscription) {
        return res.status(402).json({
          message: 'No active subscription',
          upgradeRequired: true
        });
      }

      const planLimits = BillingService.getPlanLimits(subscription.plan_type);
      const hasFeature = planLimits.features.includes(feature) || planLimits.features.includes('all_features');

      if (!hasFeature) {
        return res.status(402).json({
          message: `Feature '${feature}' not available in current plan`,
          currentPlan: subscription.plan_type,
          upgradeRequired: true
        });
      }

      return next();
    } catch (error) {
      return next();
    }
  };
};