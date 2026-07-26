import { Request, Response } from 'express';
import crypto from 'crypto';
import { BillingService } from '@modules/billing/billing.service';
import { Subscription, PlanType, BillingCycle } from '@modules/billing/subscription.model';
import { WebhookEvent } from '@modules/billing/webhook-event.model';
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
      return ResponseUtil.success(res, { subscription, usage, limits }, 'Subscription details retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async createSubscription(req: TenantRequest, res: Response) {
    try {
      const { planType, billingCycle } = req.body;
      if (!Object.values(PlanType).includes(planType)) return ResponseUtil.error(res, 'Invalid plan type', 400);
      if (!Object.values(BillingCycle).includes(billingCycle)) return ResponseUtil.error(res, 'Invalid billing cycle', 400);

      const result = await BillingService.createSubscription(req.tenant!.id, planType, billingCycle);
      // authorization_url is where the tenant completes payment to activate.
      return ResponseUtil.success(res, result, 'Subscription initialized — complete payment to activate', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  static async upgradePlan(req: TenantRequest, res: Response) {
    try {
      const { planType } = req.body;
      if (!Object.values(PlanType).includes(planType)) return ResponseUtil.error(res, 'Invalid plan type', 400);
      const result = await BillingService.upgradePlan(req.tenant!.id, planType);
      return ResponseUtil.success(res, result, 'Upgrade initialized — complete payment to activate');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  static async downgradePlan(req: TenantRequest, res: Response) {
    try {
      const { planType } = req.body;
      if (!Object.values(PlanType).includes(planType)) return ResponseUtil.error(res, 'Invalid plan type', 400);
      const subscription = await BillingService.downgradePlan(req.tenant!.id, planType);
      return ResponseUtil.success(res, subscription, 'Downgrade scheduled for the next renewal');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  static async cancelSubscription(req: TenantRequest, res: Response) {
    try {
      const immediate = req.body?.immediate === true;
      const subscription = await BillingService.cancelSubscription(req.tenant!.id, immediate);
      return ResponseUtil.success(res, subscription, immediate ? 'Subscription cancelled' : 'Subscription will cancel at the end of the current period');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  static async reactivateSubscription(req: TenantRequest, res: Response) {
    try {
      const subscription = await BillingService.reactivateSubscription(req.tenant!.id);
      return ResponseUtil.success(res, subscription, 'Subscription reactivated');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  static async getHistory(req: TenantRequest, res: Response) {
    try {
      const history = await Subscription.findAll({ where: { tenant_id: req.tenant!.id }, order: [['createdAt', 'DESC']] });
      return ResponseUtil.success(res, history, 'Subscription history retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getUsage(req: TenantRequest, res: Response) {
    try {
      const usage = await BillingService.getCurrentUsage(req.tenant!.id);
      const { withinLimits, violations } = await BillingService.checkUsageLimits(req.tenant!.id);
      return ResponseUtil.success(res, { usage, withinLimits, violations }, 'Usage information retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * Paystack subscription webhook. Signature-verified (HMAC-SHA512 over the raw
   * body with PAYSTACK_SECRET_KEY); drives subscription state transitions.
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY as string;
      const raw = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers['x-paystack-signature'] as string;
      const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
      if (!signature || hash !== signature) {
        return res.status(401).json({ status: 'error', message: 'Invalid signature' });
      }

      const event = typeof req.body === 'object' ? req.body : JSON.parse(raw);

      // Idempotency: process each Paystack event once.
      const d = event?.data || {};
      const eventKey = `${event?.event || 'unknown'}:${d.id || d.reference || d.subscription_code || ''}`;
      const isNew = await WebhookEvent.recordOnce('paystack', eventKey, event?.event);
      if (!isNew) return res.status(200).json({ received: true, duplicate: true });

      await BillingService.handleSubscriptionWebhook(event);
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Subscription webhook error:', error);
      return res.status(200).json({ received: true }); // never make Paystack retry on our bug
    }
  }
}
