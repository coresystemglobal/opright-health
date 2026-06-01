import { Response } from 'express';
import { BillingService } from '@modules/billing/billing.service';

import { PlanType, BillingCycle } from '@modules/billing/subscription.model';

import { ResponseUtil } from '@utils/response.util';
import { TenantRequest } from '@middlewares/tenant.middleware';

export class BillingController {
  static async getPlans(req: TenantRequest, res: Response) {
    try {
      const plans = Object.values(PlanType).map(planType => ({
        type: planType,
        limits: BillingService.getPlanLimits(planType),
        pricing: BillingService.getPlanPricing(planType)
      }));

      return ResponseUtil.success(res, plans, 'Plans retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getCurrentSubscription(req: TenantRequest, res: Response) {
    try {
      const subscription = await BillingService.getCurrentSubscription(req.tenant!.id);
      const usage = await BillingService.getCurrentUsage(req.tenant!.id);
      const limits = subscription ? BillingService.getPlanLimits(subscription.plan_type) : null;

      return ResponseUtil.success(res, {
        subscription,
        usage,
        limits
      }, 'Subscription details retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async createSubscription(req: TenantRequest, res: Response) {
    try {
      const { planType, billingCycle } = req.body;

      if (!Object.values(PlanType).includes(planType)) {
        return ResponseUtil.error(res, 'Invalid plan type', 400);
      }

      if (!Object.values(BillingCycle).includes(billingCycle)) {
        return ResponseUtil.error(res, 'Invalid billing cycle', 400);
      }

      const subscription = await BillingService.createSubscription(
        req.tenant!.id,
        planType,
        billingCycle
      );

      return ResponseUtil.success(res, subscription, 'Subscription created successfully', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async upgradePlan(req: TenantRequest, res: Response) {
    try {
      const { planType } = req.body;

      if (!Object.values(PlanType).includes(planType)) {
        return ResponseUtil.error(res, 'Invalid plan type', 400);
      }

      const subscription = await BillingService.upgradePlan(req.tenant!.id, planType);

      return ResponseUtil.success(res, subscription, 'Plan upgraded successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getUsage(req: TenantRequest, res: Response) {
    try {
      const usage = await BillingService.getCurrentUsage(req.tenant!.id);
      const { withinLimits, violations } = await BillingService.checkUsageLimits(req.tenant!.id);

      return ResponseUtil.success(res, {
        usage,
        withinLimits,
        violations
      }, 'Usage information retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async handleWebhook(req: TenantRequest, res: Response) {
    try {
      // Handle Stripe webhooks for subscription updates
      const event = req.body;

      switch (event.type) {
        case 'invoice.payment_succeeded':
          // Handle successful payment
          break;
        case 'invoice.payment_failed':
          // Handle failed payment
          break;
        case 'customer.subscription.updated':
          // Handle subscription updates
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          break;
      }

      return res.status(200).json({ received: true });
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}