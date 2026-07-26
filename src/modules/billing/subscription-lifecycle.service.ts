import { Op } from 'sequelize';
import { Subscription, SubscriptionStatus } from '@modules/billing/subscription.model';
import { Tenant, TenantStatus } from '@modules/tenancy/tenant.model';
import { deleteFromRedis } from '@core/redis';

const GRACE_DAYS = 3;

const invalidate = (tenantId: string) => deleteFromRedis(`sub_ctx:${tenantId}`).catch(() => null);

/**
 * Subscription lifecycle sweeper — the backstop that transitions subscription
 * state on a schedule (webhooks handle the real-time transitions; this catches
 * everything time-based). Runs daily.
 *
 * - Expired trials (never converted to a paid charge) → PAST_DUE with a grace window.
 * - Grace window elapsed on a PAST_DUE sub → CANCELLED + tenant SUSPENDED (non-payment).
 * - A cancel-at-period-end whose period has ended → CANCELLED (voluntary; no suspend).
 */
export async function runSubscriptionLifecycleCycle(): Promise<{ trialsExpired: number; graceCancelled: number; periodEndCancelled: number }> {
  const now = new Date();
  let trialsExpired = 0, graceCancelled = 0, periodEndCancelled = 0;

  // 1. Trials that ran out without an activating charge.
  const expiredTrials = await Subscription.findAll({
    where: { status: SubscriptionStatus.TRIALING, trial_end: { [Op.ne]: null, [Op.lt]: now } }
  });
  for (const sub of expiredTrials) {
    const grace = new Date(now);
    grace.setDate(grace.getDate() + GRACE_DAYS);
    await sub.update({ status: SubscriptionStatus.PAST_DUE, grace_period_ends_at: grace });
    await Tenant.update({ subscription_status: SubscriptionStatus.PAST_DUE }, { where: { id: sub.tenant_id } });
    await invalidate(sub.tenant_id);
    trialsExpired++;
  }

  // 2. PAST_DUE whose grace window has elapsed → cancel + suspend the tenant.
  const lapsed = await Subscription.findAll({
    where: { status: SubscriptionStatus.PAST_DUE, grace_period_ends_at: { [Op.ne]: null, [Op.lt]: now } }
  });
  for (const sub of lapsed) {
    await sub.update({ status: SubscriptionStatus.CANCELLED, cancelled_at: sub.cancelled_at || now });
    await Tenant.update(
      { subscription_status: SubscriptionStatus.CANCELLED, status: TenantStatus.SUSPENDED },
      { where: { id: sub.tenant_id } }
    );
    await invalidate(sub.tenant_id);
    graceCancelled++;
  }

  // 3. Voluntary cancel-at-period-end whose period has now ended.
  const scheduled = await Subscription.findAll({
    where: {
      cancelled_at: { [Op.ne]: null },
      current_period_end: { [Op.lt]: now },
      status: { [Op.ne]: SubscriptionStatus.CANCELLED }
    }
  });
  for (const sub of scheduled) {
    await sub.update({ status: SubscriptionStatus.CANCELLED });
    await Tenant.update({ subscription_status: SubscriptionStatus.CANCELLED }, { where: { id: sub.tenant_id } });
    await invalidate(sub.tenant_id);
    periodEndCancelled++;
  }

  return { trialsExpired, graceCancelled, periodEndCancelled };
}
