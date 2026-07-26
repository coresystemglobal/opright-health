import { Op } from 'sequelize';
import { Subscription, PlanType, BillingCycle, SubscriptionStatus } from '@modules/billing/subscription.model';

import { UsageTracking } from '@modules/billing/usage-tracking.model';

import { Tenant } from '@modules/tenancy/tenant.model';
import { Plan } from '@modules/billing/plan.model';
import { PlanConfig } from '@config/plan.config';
import type { PlanLimits, PlanPricing } from '@config/plan.config';
import { getFromRedis, saveToRedis, deleteFromRedis } from '@core/redis';
import paystack from '@modules/billing/providers/paystack.service';
import Stripe from 'stripe';

const SUBSCRIPTION_CACHE_TTL = 300; // 5 minutes

export class BillingService {
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

  // Plan limits/pricing cache. Seeded from PlanConfig (the fallback) and
  // overwritten by refreshPlansCache() from the `plans` DB table. Kept in
  // memory so getPlanLimits/getPlanPricing stay synchronous for all callers.
  private static PLAN_LIMITS: Record<PlanType, PlanLimits> = { ...PlanConfig.limits };
  private static PLAN_PRICING: Record<PlanType, PlanPricing> = { ...PlanConfig.pricing };

  /**
   * Load plans from the DB into the in-memory cache. Call at boot and after any
   * plan admin write. If the table is empty/unavailable, the PlanConfig
   * fallback stays in place.
   */
  static async refreshPlansCache(): Promise<void> {
    try {
      const plans = await Plan.findAll({ where: { is_active: true } });
      for (const p of plans) {
        this.PLAN_LIMITS[p.tier] = {
          maxPatients: p.max_patients,
          maxUsers: p.max_users,
          maxStorageMB: p.max_storage_mb,
          maxAPICallsPerMonth: p.max_api_calls_per_month,
          features: p.features || []
        };
        this.PLAN_PRICING[p.tier] = {
          monthly: parseFloat(p.price_monthly.toString()),
          yearly: parseFloat(p.price_yearly.toString())
        };
      }
    } catch (error) {
      console.error('refreshPlansCache failed; using PlanConfig fallback:', error);
    }
  }

  private static periodEndFor(cycle: BillingCycle, from: Date = new Date()): Date {
    const end = new Date(from);
    if (cycle === BillingCycle.MONTHLY) end.setMonth(end.getMonth() + 1);
    else end.setFullYear(end.getFullYear() + 1);
    return end;
  }

  /** Drop the cached subscription context so the next request recomputes it. */
  static async invalidateSubscriptionCache(tenantId: string): Promise<void> {
    await deleteFromRedis(`sub_ctx:${tenantId}`).catch(() => null);
  }

  private static async getOrCreatePaystackCustomer(tenant: Tenant): Promise<string | null> {
    if (tenant.paystack_customer_id) return tenant.paystack_customer_id;
    const code = await paystack.createCustomer(tenant.billing_email || tenant.contact_email, tenant.name, tenant.contact_phone);
    if (code) await tenant.update({ paystack_customer_id: code });
    return code;
  }

  /**
   * Start a Paystack subscription: charges the customer for the plan and returns
   * a checkout URL. The local Subscription is created TRIALING and flips to
   * ACTIVE when the charge.success webhook arrives (which also stores the
   * Paystack subscription_code). Requires the Plan to have a paystack_plan_code.
   */
  static async createSubscription(
    tenantId: string,
    planType: PlanType,
    billingCycle: BillingCycle = BillingCycle.MONTHLY
  ): Promise<{ subscription: Subscription; authorization_url: string | null; reference: string | null }> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const plan = await Plan.findOne({ where: { tier: planType } });
    const planCode = billingCycle === BillingCycle.MONTHLY ? plan?.paystack_plan_code_monthly : plan?.paystack_plan_code_yearly;
    if (!planCode) throw new Error(`Plan '${planType}' has no Paystack plan code for the ${billingCycle} cycle; configure it via /api/plans first`);

    const email = tenant.billing_email || tenant.contact_email;
    await this.getOrCreatePaystackCustomer(tenant);

    const init: any = await paystack.initializeSubscription(email, planCode, { tenant_id: tenantId, plan_type: planType, billing_cycle: billingCycle });
    if (init.statusCode !== 200) throw new Error(init.message || 'Failed to initialize subscription checkout');

    const now = new Date();
    const subscription = await Subscription.create({
      tenant_id: tenantId,
      plan_type: planType,
      billing_cycle: billingCycle,
      status: SubscriptionStatus.TRIALING,
      amount: this.PLAN_PRICING[planType][billingCycle],
      current_period_start: now,
      current_period_end: this.periodEndFor(billingCycle, now),
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });

    await tenant.update({ subscription_status: SubscriptionStatus.TRIALING, billing_email: email });
    await this.invalidateSubscriptionCache(tenantId);

    return { subscription, authorization_url: init.data?.authorization_url || null, reference: init.data?.reference || null };
  }

  /** Cancel — at period end by default (keeps access until then); the lifecycle cron finalizes it. */
  static async cancelSubscription(tenantId: string, immediate = false): Promise<Subscription> {
    const subscription = await this.getCurrentSubscription(tenantId);
    if (!subscription) throw new Error('No active subscription to cancel');

    if (subscription.paystack_subscription_code) {
      await paystack.disableSubscription(subscription.paystack_subscription_code).catch(() => false);
    }

    const now = new Date();
    if (immediate) {
      await subscription.update({ status: SubscriptionStatus.CANCELLED, cancelled_at: now });
      await Tenant.update({ subscription_status: SubscriptionStatus.CANCELLED }, { where: { id: tenantId } });
    } else {
      // Keep ACTIVE until current_period_end; cron transitions to CANCELLED then.
      await subscription.update({ cancelled_at: now });
    }
    await this.invalidateSubscriptionCache(tenantId);
    return subscription;
  }

  /** Undo a pending cancellation while still within the paid period. */
  static async reactivateSubscription(tenantId: string): Promise<Subscription> {
    const subscription = await Subscription.findOne({ where: { tenant_id: tenantId }, order: [['createdAt', 'DESC']] });
    if (!subscription) throw new Error('No subscription found');
    if (!subscription.cancelled_at && subscription.status === SubscriptionStatus.ACTIVE) return subscription;
    if (new Date(subscription.current_period_end) < new Date()) throw new Error('Subscription period has ended; create a new subscription');

    if (subscription.paystack_subscription_code) {
      await paystack.enableSubscription(subscription.paystack_subscription_code).catch(() => false);
    }
    await subscription.update({ status: SubscriptionStatus.ACTIVE, cancelled_at: null });
    await Tenant.update({ subscription_status: SubscriptionStatus.ACTIVE }, { where: { id: tenantId } });
    await this.invalidateSubscriptionCache(tenantId);
    return subscription;
  }

  /** Schedule a downgrade for the next renewal (applied by applyRenewal on charge.success). */
  static async downgradePlan(tenantId: string, newPlanType: PlanType): Promise<Subscription> {
    const subscription = await this.getCurrentSubscription(tenantId);
    if (!subscription) throw new Error('No active subscription');
    await subscription.update({ pending_plan_type: newPlanType });
    await this.invalidateSubscriptionCache(tenantId);
    return subscription;
  }

  /** Apply a renewal charge: extend the period, clear trial, and apply any scheduled downgrade. */
  static async applyRenewal(subscription: Subscription): Promise<void> {
    const patch: any = {
      status: SubscriptionStatus.ACTIVE,
      current_period_start: new Date(),
      current_period_end: this.periodEndFor(subscription.billing_cycle),
      grace_period_ends_at: null
    };
    if (subscription.pending_plan_type) {
      patch.plan_type = subscription.pending_plan_type;
      patch.amount = this.PLAN_PRICING[subscription.pending_plan_type as PlanType][subscription.billing_cycle];
      patch.pending_plan_type = null;
    }
    await subscription.update(patch);
    await Tenant.update({ subscription_status: SubscriptionStatus.ACTIVE }, { where: { id: subscription.tenant_id } });
    await this.invalidateSubscriptionCache(subscription.tenant_id);
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

  /**
   * Immediate upgrade. Paystack can't change a live subscription's plan, so we
   * disable the current subscription and start a new one on the higher tier
   * (returns a checkout URL for the new plan's first charge).
   */
  static async upgradePlan(tenantId: string, newPlanType: PlanType): Promise<{ subscription: Subscription; authorization_url: string | null; reference: string | null }> {
    const current = await this.getCurrentSubscription(tenantId);
    if (!current) throw new Error('No active subscription found');

    const cycle = current.billing_cycle;
    if (current.paystack_subscription_code) {
      await paystack.disableSubscription(current.paystack_subscription_code).catch(() => false);
    }
    await current.update({ status: SubscriptionStatus.CANCELLED, cancelled_at: new Date() });

    return this.createSubscription(tenantId, newPlanType, cycle);
  }

  /**
   * Handle a verified Paystack subscription/billing webhook event. Correlates
   * the event to a tenant (via metadata.tenant_id or the Paystack customer code)
   * and transitions the local subscription + tenant status.
   */
  static async handleSubscriptionWebhook(event: any): Promise<void> {
    const data = event?.data || {};
    const type: string = event?.event || '';

    // Resolve the tenant for this event.
    let tenantId: string | undefined = data.metadata?.tenant_id;
    if (!tenantId && data.customer?.customer_code) {
      const tenant = await Tenant.findOne({ where: { paystack_customer_id: data.customer.customer_code } });
      tenantId = tenant?.id;
    }
    if (!tenantId && data.subscription_code) {
      const sub = await Subscription.findOne({ where: { paystack_subscription_code: data.subscription_code } });
      tenantId = sub?.tenant_id;
    }
    if (!tenantId) return;

    const subscription = await this.getCurrentSubscription(tenantId)
      || await Subscription.findOne({ where: { tenant_id: tenantId }, order: [['createdAt', 'DESC']] });
    if (!subscription) return;

    switch (type) {
      case 'subscription.create':
        if (data.subscription_code) await subscription.update({ paystack_subscription_code: data.subscription_code });
        break;
      case 'charge.success':
      case 'invoice.payment_succeeded':
        // Store the subscription code if this is the activating charge, then renew.
        if (data.subscription?.subscription_code && !subscription.paystack_subscription_code) {
          await subscription.update({ paystack_subscription_code: data.subscription.subscription_code });
        }
        await this.applyRenewal(subscription);
        break;
      case 'invoice.payment_failed':
      case 'invoice.update': {
        // Failed renewal → past due with a short grace window.
        const grace = new Date();
        grace.setDate(grace.getDate() + 3);
        await subscription.update({ status: SubscriptionStatus.PAST_DUE, grace_period_ends_at: grace });
        await Tenant.update({ subscription_status: SubscriptionStatus.PAST_DUE }, { where: { id: tenantId } });
        await this.invalidateSubscriptionCache(tenantId);
        break;
      }
      case 'subscription.disable':
      case 'subscription.not_renew':
        await subscription.update({ status: SubscriptionStatus.CANCELLED, cancelled_at: new Date() });
        await Tenant.update({ subscription_status: SubscriptionStatus.CANCELLED }, { where: { id: tenantId } });
        await this.invalidateSubscriptionCache(tenantId);
        break;
      default:
        break;
    }
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
      [PlanType.INDIVIDUAL]: {
        [BillingCycle.MONTHLY]: 'price_individual_monthly',
        [BillingCycle.YEARLY]: 'price_individual_yearly'
      },
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