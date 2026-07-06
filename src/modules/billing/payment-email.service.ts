import sendEmail from '@shared/email/email.service';
import { Payment } from './payment.model';
import { Invoice } from './invoice.model';
import { Patient } from '@modules/patients/patient.model';

const NAVY  = '#1e3a8a';
const BLUE  = '#1d4ed8';
const GREEN = '#16a34a';
const FONT  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(amount);
}

/**
 * Sends a payment receipt email to the patient after a successful payment.
 * Loads the linked invoice and patient if not already eager-loaded.
 */
export async function sendPaymentReceiptEmail(payment: Payment): Promise<void> {
  // Reload with associations if not already present
  let invoice: Invoice | null = (payment.invoice as Invoice) || null;
  if (!invoice && payment.invoice_id) {
    invoice = await Invoice.findByPk(payment.invoice_id, {
      include: [{ model: Patient, as: 'patient' }]
    });
  }

  const patient: Patient | null = (invoice as any)?.patient || null;
  const email = patient?.email;
  if (!email) return;

  const amount     = parseFloat(payment.amount.toString());
  const paidAt     = payment.processed_at || payment.payment_date;
  const paidAtStr  = paidAt
    ? new Date(paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const outstandingRaw = invoice
    ? parseFloat(invoice.total_amount.toString()) - parseFloat(invoice.paid_amount.toString())
    : 0;
  const outstanding = Math.max(0, outstandingRaw);

  const html = `
    <div style="font-family: ${FONT}; background-color: #f0f4ff; padding: 32px 16px;">
      <div style="max-width: 600px; margin: 0 auto;">

        <div style="background-color: ${NAVY}; border-radius: 8px 8px 0 0; padding: 20px 32px;">
          <span style="color: #ffffff; font-size: 18px; font-weight: 600;">Hospital Management System</span>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 32px;">
          <p style="margin: 0 0 16px; font-size: 14px; color: #0f172a;">
            Dear <strong>${patient?.first_name} ${patient?.last_name}</strong>,
          </p>

          <!-- Success banner -->
          <div style="padding: 14px 16px; background-color: #dcfce7; border-left: 4px solid ${GREEN};
                      border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #14532d; font-weight: 500;">
              ✓ Payment of <strong>${formatNGN(amount)}</strong> received successfully.
            </p>
          </div>

          <!-- Receipt table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="background-color: #e8f0fe;">
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a; width: 50%;">Receipt Reference</td>
              <td style="padding: 10px 12px; font-size: 12px; color: #475569;">${payment.reference_number || payment.transaction_id || '—'}</td>
            </tr>
            ${invoice ? `
            <tr>
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Invoice Number</td>
              <td style="padding: 10px 12px; font-size: 12px; color: #475569;">${invoice.invoice_number}</td>
            </tr>` : ''}
            <tr style="background-color: #e8f0fe;">
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Amount Paid</td>
              <td style="padding: 10px 12px; font-size: 14px; font-weight: 700; color: ${GREEN};">${formatNGN(amount)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Payment Method</td>
              <td style="padding: 10px 12px; font-size: 12px; color: #475569;">${payment.payment_processor?.toUpperCase() || payment.payment_method}</td>
            </tr>
            <tr style="background-color: #e8f0fe;">
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Date &amp; Time</td>
              <td style="padding: 10px 12px; font-size: 12px; color: #475569;">${paidAtStr}</td>
            </tr>
            ${outstanding > 0 ? `
            <tr>
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Remaining Balance</td>
              <td style="padding: 10px 12px; font-size: 12px; color: #d97706; font-weight: 600;">${formatNGN(outstanding)}</td>
            </tr>` : `
            <tr>
              <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Balance</td>
              <td style="padding: 10px 12px; font-size: 12px; color: ${GREEN}; font-weight: 600;">Fully paid</td>
            </tr>`}
          </table>

          ${invoice ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice.id}"
               style="display: inline-block; background-color: ${BLUE}; color: #ffffff; font-family: ${FONT};
                      font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
              View Invoice
            </a>
          </div>` : ''}

          <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
            Please keep this receipt for your records. If you have questions, contact our billing department.
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none;
                    border-radius: 0 0 8px 8px; padding: 14px 32px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #475569;">Hospital Management System — Billing Department</p>
        </div>

      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Payment receipt — ${invoice?.invoice_number || payment.reference_number}`,
    text: `Your payment of ${formatNGN(amount)} was received. Reference: ${payment.reference_number}`,
    html
  });
}
