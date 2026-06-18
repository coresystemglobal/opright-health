import { Payment } from '../modules/billing/payment.model';
import { Invoice, InvoiceType, PaymentStatus as InvoicePaymentStatus } from '../models/invoice.model';

/**
 * Called after a payment is verified when no invoice_id was supplied at
 * initiation time (e.g. ad-hoc patient fee collected at reception).
 *
 * Creates a minimal invoice so there is always a paper trail, then
 * immediately records the payment against it.
 */
export async function autoCreateInvoiceForPayment(payment: Payment): Promise<Invoice | null> {
  if (payment.invoice_id) return null;

  // invoice.patient_id and invoice.doctor_id are required by the DB schema.
  // Without a patient context we can't create a valid invoice — caller must
  // link the payment to an invoice explicitly in that case.
  const metadata: Record<string, string> = payment.processor_response || {};
  const patientId = metadata.patient_id;
  const doctorId  = metadata.doctor_id;
  if (!patientId || !doctorId) return null;

  const amount     = parseFloat(payment.amount.toString());
  const invoiceDate = new Date();
  const dueDate     = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await Invoice.create({
    patient_id:     patientId,
    doctor_id:      doctorId,
    invoice_type:   InvoiceType.OTHER,
    description:    `Auto-generated for payment reference ${payment.reference_number}`,
    subtotal:       amount,
    tax_rate:       0,
    tax_amount:     0,
    discount_amount: 0,
    total_amount:   amount,
    paid_amount:    amount,
    payment_status: InvoicePaymentStatus.PAID,
    invoice_date:   invoiceDate,
    due_date:       dueDate,
    paid_at:        payment.processed_at || new Date(),
    reference_number: payment.reference_number
  } as any);

  return invoice;
}
