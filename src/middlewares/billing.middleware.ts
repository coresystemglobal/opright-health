import { Response, NextFunction } from 'express';
import { BillingService } from '@modules/billing/billing.service';
import { SubscriptionStatus } from '@modules/billing/subscription.model';
import { TenantRequest } from './tenant.middleware';

type UsageMetric = 'patients_count' | 'users_count' | 'api_calls_count' | 'storage_used_mb';

/**
 * Core subscription gate. Applied globally (or per-router).
 *
 * Behaviour by subscription state:
 *  ACTIVE           → pass through
 *  TRIALING         → pass through + X-Trial-Days-Remaining header
 *  PAST_DUE (grace) → pass through + X-Grace-Days-Remaining header
 *  PAST_DUE (lapsed)→ 402
 *  CANCELLED        → 402
 *  none             → 402
 *
 * The tenant is resolved from req.tenant (when tenantMiddleware ran
 * earlier) or the x-tenant-id header/query directly. Requests that
 * carry no tenant identity pass through — tenant-scoped routes still
 * enforce the header via tenantMiddleware, and the gate bites on any
 * request that does identify a tenant.
 *
 * Errors in the check (DB down, etc.) fall through gracefully so the
 * API stays available while billing infra recovers.
 */
export const requireActiveSubscription = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const tenantId =
    req.tenant?.id ||
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenant_id as string);

  if (!tenantId) {
    return next();
  }

  try {
    const ctx = await BillingService.getSubscriptionContext(tenantId);

    if (!ctx.subscription) {
      return res.status(402).json({
        status: 'error',
        code: 'NO_SUBSCRIPTION',
        message: 'No active subscription. Please subscribe to a plan to continue.',
        upgradeRequired: true
      });
    }

    const { subscription } = ctx;

    if (ctx.isTrialing) {
      res.setHeader('X-Trial-Days-Remaining', ctx.trialDaysRemaining.toString());
      return next();
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return next();
    }

    if (ctx.isInGracePeriod) {
      res.setHeader('X-Grace-Days-Remaining', ctx.graceDaysRemaining.toString());
      res.setHeader('X-Subscription-Warning', 'payment_overdue');
      return next();
    }

    // PAST_DUE with no grace, CANCELLED, or any other blocked state
    const messageMap: Record<string, string> = {
      [SubscriptionStatus.PAST_DUE]:   'Your payment is overdue. Please update your payment method to restore access.',
      [SubscriptionStatus.CANCELLED]:  'Your subscription has been cancelled. Please subscribe to a plan to continue.'
    };

    return res.status(402).json({
      status: 'error',
      code: `SUBSCRIPTION_${subscription.status.toUpperCase()}`,
      message: messageMap[subscription.status] ?? 'Subscription is inactive.',
      upgradeRequired: true
    });
  } catch {
    // Fail open — billing infra should not take down the API
    return next();
  }
};

/**
 * Checks that a specific resource limit has not been reached before
 * allowing a creation operation. Use on POST routes that create
 * patients or users.
 *
 * Attaches `req.__trackUsage` — call it after a successful DB insert
 * to increment the usage counter without a separate service-layer call.
 *
 * @param metric   The UsageTracking column to check and increment.
 * @param limitKey The PlanLimits field that caps this resource.
 * @param label    Human-readable resource name for error messages.
 */
export const checkResourceLimit = (
  metric: UsageMetric,
  limitKey: 'maxPatients' | 'maxUsers',
  label: string
) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ status: 'error', message: 'Tenant context required' });
    }

    try {
      const sub = await BillingService.getCurrentSubscription(req.tenant.id);
      if (!sub) {
        return res.status(402).json({
          status: 'error',
          code: 'NO_SUBSCRIPTION',
          message: `Cannot create ${label}: no active subscription.`,
          upgradeRequired: true
        });
      }

      const limits = BillingService.getPlanLimits(sub.plan_type);
      const cap = limits[limitKey];

      if (cap !== -1) {
        const usage = await BillingService.getCurrentUsage(req.tenant.id);
        const current = usage[metric] as number;

        if (current >= cap) {
          return res.status(402).json({
            status: 'error',
            code: 'PLAN_LIMIT_REACHED',
            message: `${label} limit reached for your plan (${current}/${cap}). Please upgrade to add more.`,
            current,
            limit: cap,
            upgradeRequired: true
          });
        }
      }

      (req as any).__trackUsage = async () => {
        await BillingService.trackUsage(req.tenant!.id, metric).catch(() => null);
      };

      return next();
    } catch {
      return next();
    }
  };
};

/**
 * Tracks API call volume. Applied in checkPlanLimits so every
 * guarded request increments the counter.
 */
export const checkPlanLimits = (feature?: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant required' });
    }

    try {
      const { withinLimits, violations } = await BillingService.checkUsageLimits(req.tenant.id);

      if (!withinLimits) {
        return res.status(402).json({
          status: 'error',
          code: 'USAGE_LIMITS_EXCEEDED',
          message: 'Usage limits exceeded',
          violations,
          upgradeRequired: true
        });
      }

      BillingService.trackUsage(req.tenant.id, 'api_calls_count').catch(() => null);

      return next();
    } catch {
      return next();
    }
  };
};

export const requireFeature = (feature: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant required' });
    }

    try {
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
    } catch {
      return next();
    }
  };
};
