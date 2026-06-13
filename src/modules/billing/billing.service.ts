import { Op } from 'sequelize';
import { Subscription, PlanType, BillingCycle, SubscriptionStatus } from '@modules/billing/subscription.model';

import { UsageTracking } from '@modules/billing/usage-tracking.model';

import { Tenant } from '@modules/tenancy/tenant.model';
import { PlanConfig } from '@config/plan.config';
import type { PlanLimits, PlanPricing } from '@config/plan.config';
import { getFromRedis, saveToRedis } from '@core/redis';
import Stripe from 'stripe';

const SUBSCRIPTION_CACHE_TTL = 300; // 5 minutes

export class BillingService {
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

  // Use configurable pricing and limits from PlanConfig
  private static readonly PLAN_LIMITS: Record<PlanType, PlanLimits> = PlanConfig.limits;
  private static readonly PLAN_PRICING: Record<PlanType, PlanPricing> = PlanConfig.pricing;

  static async createSubscription(
    tenantId: string,
    planType: PlanType,
    billingCycle: BillingCycle = BillingCycle.MONTHLY
  ): Promise<Subscription> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const amount = this.PLAN_PRICING[planType][billingCycle];
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (billingCycle === BillingCycle.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create Stripe subscription
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: tenant.stripe_customer_id || await this.createStripeCustomer(tenant),
      items: [{ price: this.getStripePriceId(planType, billingCycle) }],
      trial_period_days: 14
    });

    return Subscription.create({
      tenant_id: tenantId,
      plan_type: planType,
      billing_cycle: billingCycle,
      status: SubscriptionStatus.TRIALING,
      amount,
      current_period_start: now,
      current_period_end: periodEnd,
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      stripe_subscription_id: stripeSubscription.id
    });
  }

  static async checkUsageLimits(tenantId: string): Promise<{ withinLimits: boolean; violations: string[] }> {
    const subscription = await Subscription.findOne({
      where: {
        tenant_id: tenantId,
        status: { [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
      }
    });

    if (!subscription) {
      return { withinLimits: false, violations: ['No active subscription'] };
    }

    const limits = this.PLAN_LIMITS[subscription.plan_type];
    const usage = await this.getCurrentUsage(tenantId);
    const violations: string[] = [];

    if (limits.maxPatients !== -1 && usage.patients_count >= limits.maxPatients) {
      violations.push(`Patient limit reached: ${usage.patients_count}/${limits.maxPatients}`);
    }

    if (limits.maxUsers !== -1 && usage.users_count >= limits.maxUsers) {
      violations.push(`User seat limit reached: ${usage.users_count}/${limits.maxUsers}`);
    }

    if (limits.maxStorageMB !== -1 && usage.storage_used_mb > limits.maxStorageMB) {
      violations.push(`Storage limit exceeded: ${usage.storage_used_mb}MB/${limits.maxStorageMB}MB`);
    }

    if (limits.maxAPICallsPerMonth !== -1 && usage.api_calls_count > limits.maxAPICallsPerMonth) {
      violations.push(`API call limit exceeded: ${usage.api_calls_count}/${limits.maxAPICallsPerMonth}`);
    }

    return { withinLimits: violations.length === 0, violations };
  }

  static async trackUsage(tenantId: string, metric: keyof UsageTracking, increment: number = 1): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [usage] = await UsageTracking.findOrCreate({
      where: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd
      },
      defaults: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        patients_count: 0,
        appointments_count: 0,
        lab_tests_count: 0,
        storage_used_mb: 0,
        api_calls_count: 0,
        users_count: 0
      }
    });

    await usage.increment(metric as string, { by: increment });
  }

  static async getCurrentUsage(tenantId: string): Promise<UsageTracking> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [usage] = await UsageTracking.findOrCreate({
      where: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd
      },
      defaults: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        patients_count: 0,
        appointments_count: 0,
        lab_tests_count: 0,
        storage_used_mb: 0,
        api_calls_count: 0,
        users_count: 0
      }
    });

    return usage;
  }

  static async upgradePlan(tenantId: string, newPlanType: PlanType): Promise<Subscription> {
    const subscription = await Subscription.findOne({
      where: { tenant_id: tenantId, status: SubscriptionStatus.ACTIVE }
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const newAmount = this.PLAN_PRICING[newPlanType][subscription.billing_cycle];

    // Update Stripe subscription
    if (subscription.stripe_subscription_id) {
      await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [{
          id: (await this.stripe.subscriptions.retrieve(subscription.stripe_subscription_id)).items.data[0].id,
          price: this.getStripePriceId(newPlanType, subscription.billing_cycle)
        }],
        proration_behavior: 'create_prorations'
      });
    }

    await subscription.update({
      plan_type: newPlanType,
      amount: newAmount
    });

    return subscription;
  }

  static getPlanLimits(planType: PlanType): PlanLimits {
    return this.PLAN_LIMITS[planType];
  }

  static getPlanPricing(planType: PlanType): PlanPricing {
    return this.PLAN_PRICING[planType];
  }

  static async getCurrentSubscription(tenantId: string): Promise<Subscription | null> {
    return Subscription.findOne({
      where: {
        tenant_id: tenantId,
        status: { [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  static async getSubscriptionContext(tenantId: string): Promise<{
    subscription: Subscription | null;
    isAccessAllowed: boolean;
    isTrialing: boolean;
    trialDaysRemaining: number;
    isInGracePeriod: boolean;
    graceDaysRemaining: number;
    status: string | null;
  }> {
    const cacheKey = `sub_ctx:${tenantId}`;
    const cached = await getFromRedis(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached as string); } catch { /* fall through */ }
    }

    const subscription = await this.getCurrentSubscription(tenantId);
    const ctx = {
      subscription,
      isAccessAllowed:    subscription ? subscription.is_access_allowed    : false,
      isTrialing:         subscription ? subscription.is_trialing           : false,
      trialDaysRemaining: subscription ? subscription.trial_days_remaining  : 0,
      isInGracePeriod:    subscription ? subscription.is_in_grace_period    : false,
      graceDaysRemaining: subscription ? subscription.grace_days_remaining  : 0,
      status:             subscription ? subscription.status                : null
    };

    await saveToRedis(cacheKey, JSON.stringify(ctx), SUBSCRIPTION_CACHE_TTL).catch(() => null);
    return ctx;
  }

  private static async createStripeCustomer(tenant: Tenant): Promise<string> {
    const customer = await this.stripe.customers.create({
      name: tenant.name,
      email: tenant.contact_email,
      phone: tenant.contact_phone
    });

    await tenant.update({ stripe_customer_id: customer.id });
    return customer.id;
  }

  private static getStripePriceId(planType: PlanType, billingCycle: BillingCycle): string {
    // These would be actual Stripe price IDs from your Stripe dashboard
    const priceIds = {
      [PlanType.BASIC]: {
        [BillingCycle.MONTHLY]: 'price_basic_monthly',
        [BillingCycle.YEARLY]: 'price_basic_yearly'
      },
      [PlanType.STANDARD]: {
        [BillingCycle.MONTHLY]: 'price_standard_monthly',
        [BillingCycle.YEARLY]: 'price_standard_yearly'
      },
      [PlanType.PRO]: {
        [BillingCycle.MONTHLY]: 'price_pro_monthly',
        [BillingCycle.YEARLY]: 'price_pro_yearly'
      }
    };

    return priceIds[planType][billingCycle];
  }
}