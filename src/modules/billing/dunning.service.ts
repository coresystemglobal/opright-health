import { Op } from 'sequelize';
import { Invoice, PaymentStatus } from './invoice.model';
import { Patient } from '@modules/patients/patient.model';
import sendEmail from '@shared/email/email.service';

// Clinical Blue design system colours (inline for email)
const NAVY       = '#1e3a8a';
const BLUE       = '#1d4ed8';
const FONT       = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export interface DunningResult {
  invoiceId: string;
  invoiceNumber: string;
  patientEmail: string;
  stage: number;
  sent: boolean;
  error?: string;
}

/**
 * Dunning stages matched to days overdue.
 * Every stage fires once — tracked via invoice.notes sentinel to avoid
 * re-sending on repeated runs.
 */
const STAGES = [
  { day: 1,  subject: 'Payment reminder',          urgency: 'reminder' },
  { day: 3,  subject: 'Second payment reminder',   urgency: 'warning'  },
  { day: 7,  subject: 'Final payment notice',      urgency: 'final'    },
  { day: 14, subject: 'Account suspension notice', urgency: 'suspend'  }
] as const;

type Urgency = typeof STAGES[number]['urgency'];

function buildDunningEmail(invoice: Invoice, patient: Patient, urgency: Urgency): string {
  const outstanding = parseFloat(invoice.total_amount.toString()) - parseFloat(invoice.paid_amount?.toString() || '0');
  const daysOverdue = invoice.days_overdue;
  const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(outstanding);
  const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const urgencyBar: Record<Urgency, { bg: string; border: string; message: string }> = {
    reminder: {
      bg: '#fef3c7', border: '#d97706',
      message: `Your invoice <strong>${invoice.invoice_number}</strong> was due on ${dueDate}. Please arrange payment at your earliest convenience.`
    },
    warning: {
      bg: '#fef3c7', border: '#d97706',
      message: `This is a second reminder that invoice <strong>${invoice.invoice_number}</strong> is now ${daysOverdue} days overdue. Please settle the outstanding balance of <strong>${formattedAmount}</strong> to avoid service interruption.`
    },
    final: {
      bg: '#fee2e2', border: '#dc2626',
      message: `Invoice <strong>${invoice.invoice_number}</strong> is now ${daysOverdue} days overdue. This is your final notice. Your balance of <strong>${formattedAmount}</strong> must be paid within 7 days to avoid account suspension.`
    },
    suspend: {
      bg: '#fee2e2', border: '#dc2626',
      message: `Invoice <strong>${invoice.invoice_number}</strong> remains unpaid after ${daysOverdue} days. Your account has been flagged for suspension. Please contact us immediately or pay online to restore access.`
    }
  };

  const bar = urgencyBar[urgency];

  return `
    <div style="font-family: ${FONT}; background-color: #f0f4ff; padding: 32px 16px;">
      <div style="max-width: 600px; margin: 0 auto;">

        <div style="background-color: ${NAVY}; border-radius: 8px 8px 0 0; padding: 20px 32px;">
          <span style="color: #ffffff; font-size: 18px; font-weight: 600;">Hospital Management System</span>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 32px;">
          <p style="margin: 0 0 16px; font-size: 14px; color: #0f172a;">Dear <strong>${patient.first_name} ${patient.last_name}</strong>,</p>

          <div style="padding: 14px 16px; background-color: ${bar.bg}; border-left: 4px solid ${bar.border}; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #0f172a; line-height: 20px;">${bar.message}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="background-color: #e8f0fe;">
              <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #0f172a; width: 50%;">Invoice Number</td>
              <td style="padding: 8px 12px; font-size: 12px; color: #475569;">${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Due Date</td>
              <td style="padding: 8px 12px; font-size: 12px; color: #475569;">${dueDate}</td>
            </tr>
            <tr style="background-color: #e8f0fe;">
              <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Days Overdue</td>
              <td style="padding: 8px 12px; font-size: 12px; color: #475569;">${daysOverdue}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #0f172a;">Outstanding Balance</td>
              <td style="padding: 8px 12px; font-size: 14px; font-weight: 700; color: #dc2626;">${formattedAmount}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice.id}/pay"
               style="display: inline-block; background-color: ${BLUE}; color: #ffffff; font-family: ${FONT};
                      font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
              Pay Now
            </a>
          </div>

          <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
            Questions? Contact our billing department or reply to this email.
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none;
                    border-radius: 0 0 8px 8px; padding: 14px 32px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #475569;">Hospital Management System — Billing Department</p>
        </div>

      </div>
    </div>
  `;
}

/**
 * Run dunning for all overdue invoices belonging to the given tenant.
 * Safe to call from a cron job — idempotent per stage per invoice.
 */
export async function runDunningCycle(tenantId?: string): Promise<DunningResult[]> {
  const results: DunningResult[] = [];

  const where: Record<string, unknown> = {
    payment_status: [PaymentStatus.OVERDUE, PaymentStatus.PENDING, PaymentStatus.PARTIAL]
  };

  const invoices = await Invoice.findAll({
    where,
    include: [{ model: Patient, as: 'patient' }]
  });

  for (const invoice of invoices) {
    if (!invoice.is_overdue) continue;

    const patient = invoice.patient;
    const email   = patient?.email;
    if (!email) continue;

    // Determine which stage applies
    const daysOver = invoice.days_overdue;
    let applicableStage: typeof STAGES[number] | undefined;

    for (const stage of [...STAGES].reverse()) {
      if (daysOver >= stage.day) { applicableStage = stage; break; }
    }
    if (!applicableStage) continue;

    // Check if this stage was already sent (stored in invoice notes)
    const sentSentinel = `dunning_stage_${applicableStage.day}_sent`;
    const notes: string = invoice.notes || '';
    if (notes.includes(sentSentinel)) continue;

    try {
      const html = buildDunningEmail(invoice, patient!, applicableStage.urgency);
      const sent = await sendEmail({
        to: email,
        subject: `${applicableStage.subject} — ${invoice.invoice_number}`,
        text: `Invoice ${invoice.invoice_number} is ${daysOver} days overdue. Please pay immediately.`,
        html
      });

      if (sent) {
        // Mark stage sent in notes so we don't re-send
        const updatedNotes = notes
          ? `${notes}\n${sentSentinel}`
          : sentSentinel;
        await invoice.update({
          notes: updatedNotes,
          payment_status: PaymentStatus.OVERDUE
        });
      }

      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoice_number,
        patientEmail:  email,
        stage:         applicableStage.day,
        sent
      });
    } catch (error) {
      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoice_number,
        patientEmail:  email,
        stage:         applicableStage.day,
        sent:          false,
        error:         error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Mark all pending/partial invoices that have passed their due date as OVERDUE.
 * Run before runDunningCycle in the same cron job.
 */
export async function markOverdueInvoices(): Promise<number> {
  const [updated] = await Invoice.update(
    { payment_status: PaymentStatus.OVERDUE },
    {
      where: {
        payment_status: { [Op.in]: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        due_date: { [Op.lt]: new Date() }
      }
    }
  );
  return updated;
}
