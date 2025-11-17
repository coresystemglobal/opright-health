import { Subscription, PlanType, BillingCycle, SubscriptionStatus } from '../models/subscription.model';
import { UsageTracking } from '../models/usage-tracking.model';
import { Tenant } from '../models/tenant.model';
import Stripe from 'stripe';

interface PlanLimits {
  maxPatients: number;
  maxUsers: number;
  maxStorageMB: number;
  maxAPICallsPerMonth: number;
  features: string[];
}

interface PlanPricing {
  monthly: number;
  yearly: number;
}

export class BillingService {
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

  private static readonly PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    [PlanType.BASIC]: {
      maxPatients: 100,
      maxUsers: 5,
      maxStorageMB: 1024, // 1GB
      maxAPICallsPerMonth: 10000,
      features: ['basic_reporting', 'patient_management', 'appointments']
    },
    [PlanType.STANDARD]: {
      maxPatients: 500,
      maxUsers: 20,
      maxStorageMB: 5120, // 5GB
      maxAPICallsPerMonth: 50000,
      features: ['basic_reporting', 'advanced_reporting', 'patient_management', 'appointments', 'lab_integration', 'mobile_api']
    },
    [PlanType.PRO]: {
      maxPatients: -1, // Unlimited
      maxUsers: -1, // Unlimited
      maxStorageMB: 20480, // 20GB
      maxAPICallsPerMonth: 200000,
      features: ['all_features', 'fhir_compliance', 'insurance_verification', 'advanced_analytics', 'ml_predictions', 'iot_integration', 'workflow_automation', 'telemedicine', 'priority_support']
    }
  };

  private static readonly PLAN_PRICING: Record<PlanType, PlanPricing> = {
    [PlanType.BASIC]: { monthly: 99, yearly: 990 },
    [PlanType.STANDARD]: { monthly: 299, yearly: 2990 },
    [PlanType.PRO]: { monthly: 599, yearly: 5990 }
  };

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
      where: { tenant_id: tenantId, status: SubscriptionStatus.ACTIVE }
    });

    if (!subscription) {
      return { withinLimits: false, violations: ['No active subscription'] };
    }

    const limits = this.PLAN_LIMITS[subscription.plan_type];
    const usage = await this.getCurrentUsage(tenantId);
    const violations: string[] = [];

    if (limits.maxPatients !== -1 && usage.patients_count > limits.maxPatients) {
      violations.push(`Patient limit exceeded: ${usage.patients_count}/${limits.maxPatients}`);
    }

    if (limits.maxStorageMB !== -1 && usage.storage_used_mb > limits.maxStorageMB) {
      violations.push(`Storage limit exceeded: ${usage.storage_used_mb}MB/${limits.maxStorageMB}MB`);
    }

    if (limits.maxAPICallsPerMonth !== -1 && usage.api_calls_count > limits.maxAPICallsPerMonth) {
      violations.push(`API calls limit exceeded: ${usage.api_calls_count}/${limits.maxAPICallsPerMonth}`);
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
        api_calls_count: 0
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
        api_calls_count: 0
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
      where: { tenant_id: tenantId, status: SubscriptionStatus.ACTIVE }
    });
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