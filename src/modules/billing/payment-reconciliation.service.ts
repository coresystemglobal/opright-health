import { Op } from 'sequelize';
import { Payment, PaymentStatus } from '@modules/billing/payment.model';
import { paymentService } from '@modules/billing/payment.service';

/**
 * Reconcile PENDING payments against the gateway. Covers the case where a
 * customer paid but the webhook/callback never landed (dropped connection,
 * outage): we re-verify by reference and let verifyPayment mark it
 * completed/failed. Bounded to a recent window to avoid re-checking ancient
 * abandoned attempts.
 */
export async function runPaymentReconciliation(): Promise<{ checked: number; resolved: number }> {
  const now = Date.now();
  const olderThan = new Date(now - 10 * 60 * 1000);   // give the webhook 10 min first
  const notBefore = new Date(now - 2 * 24 * 60 * 60 * 1000); // ignore attempts >2 days old

  const pending = await Payment.findAll({
    where: {
      payment_status: PaymentStatus.PENDING,
      created_at: { [Op.between]: [notBefore, olderThan] }
    },
    limit: 200
  });

  let resolved = 0;
  for (const payment of pending) {
    if (!payment.reference_number) continue;
    try {
      const result = await paymentService.verifyPayment(payment.reference_number);
      if (result.status === 'success') resolved++;
    } catch {
      /* non-fatal — try again next cycle */
    }
  }

  return { checked: pending.length, resolved };
}
