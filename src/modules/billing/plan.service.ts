import { Plan } from '@modules/billing/plan.model';
import { PlanType } from '@modules/billing/subscription.model';
import { BillingService } from '@modules/billing/billing.service';
import { ValidationUtil } from '@utils/validation.util';

/**
 * Admin CRUD for the subscription plan catalogue (platform-global — not
 * tenant-scoped). Every write refreshes the BillingService in-memory cache so
 * pricing/limits/feature changes take effect without a restart.
 */
export const planService = {
  list: async (includeInactive = true) => {
    const where = includeInactive ? {} : { is_active: true };
    return Plan.findAll({ where, order: [['sort_order', 'ASC']] });
  },

  getById: async (id: string) => {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid plan ID format');
    const plan = await Plan.findByPk(id);
    if (!plan) throw new Error('Plan not found');
    return plan;
  },

  create: async (data: any) => {
    if (!data.tier || !Object.values(PlanType).includes(data.tier)) throw new Error('Valid tier is required');
    if (!data.name) throw new Error('Plan name is required');

    const existing = await Plan.findOne({ where: { tier: data.tier } });
    if (existing) throw new Error(`A plan for tier '${data.tier}' already exists`);

    const plan = await Plan.create(data);
    await BillingService.refreshPlansCache();
    return plan;
  },

  update: async (id: string, data: any) => {
    const plan = await planService.getById(id);
    const safe = { ...data };
    delete safe.id;
    delete safe.tier; // tier is the stable key; create a new plan to change it
    await plan.update(safe);
    await BillingService.refreshPlansCache();
    return plan;
  },

  remove: async (id: string) => {
    const plan = await planService.getById(id);
    await plan.destroy();
    await BillingService.refreshPlansCache();
    return true;
  }
};
