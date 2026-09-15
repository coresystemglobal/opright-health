import {
  PaymentResponse,
  PaymentRequestData,
  AllPaymentsResponse,
  FetchPaymentsRequestData,
  TransactionPurpose
} from '@appTypes/payment.types';
import { saveToRedis } from '@core/redis';
import { Payment, PaymentStatus, PaymentMethod } from '@modules/billing/payment.model';

import { Invoice } from '@modules/billing/invoice.model';
import { WebhookEvent } from '@modules/billing/webhook-event.model';

import { User } from '@modules/users/user.model';

import paymentProcessorFactory from '@modules/billing/providers/payment-processor.factory';
import { classifyWebhookOwnership } from '@config/application.config';

import { ValidationUtil } from '@utils/validation.util';
import { Op } from 'sequelize';

// Paystack charges 1.5% + ₦100 (capped at ₦2,000). We store the rate only.
const PAYSTACK_FEE_RATE = 0.015;

export const paymentService = {
  /**
   * Initiate a Paystack payment (primary gateway, currency NGN).
   * Supports paying against an invoice or as a standalone charge.
   */
  initiatePayment: async (paymentData: PaymentRequestData & {
    invoice_id?: string;
    appointment_id?: string;
    created_by: string;
    tenant_id?: string;
    transaction_purpose?: TransactionPurpose;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResponse> => {
    try {
      const {
        amount,
        email,
        currency = 'NGN',
        payment_provider = 'paystack',
        payment_method = 'online',
        invoice_id,
        appointment_id,
        created_by,
        tenant_id,
        transaction_purpose = TransactionPurpose.OTHER,
        metadata = {}
      } = paymentData;

      if (!amount || !email || !created_by) {
        return { statusCode: 400, status: 'error', message: 'amount, email, and created_by are required', data: null };
      }

      if (!ValidationUtil.isValidEmail(email)) {
        return { statusCode: 400, status: 'error', message: 'Invalid email format', data: null };
      }

      if (amount < 1) {
        return { statusCode: 400, status: 'error', message: 'Amount must be at least ₦1', data: null };
      }

      // If invoice_id provided, validate it exists and is unpaid
      if (invoice_id) {
        if (!ValidationUtil.isValidUUID(invoice_id)) {
          return { statusCode: 400, status: 'error', message: 'Invalid invoice ID', data: null };
        }
        const invoice = await Invoice.findByPk(invoice_id);
        if (!invoice) {
          return { statusCode: 404, status: 'error', message: 'Invoice not found', data: null };
        }
      }

      // Call Paystack (or selected provider)
      const paystackResult = await paymentProcessorFactory.initiatePayment({
        amount,
        email,
        currency,
        payment_provider,
        payment_method,
        metadata: {
          application_id: process.env.APPLICATION_ID || 'com.coresystemglobal.hms',
          transaction_purpose,
          invoice_id: invoice_id || null,
          appointment_id: appointment_id || null,
          created_by,
          ...metadata
        }
      } as any);

      if (paystackResult.statusCode !== 200 || !paystackResult.data?.reference) {
        return paystackResult;
      }

      const reference = paystackResult.data.reference;

      // Calculate Paystack processing fee
      const feeRate = payment_provider === 'paystack' ? PAYSTACK_FEE_RATE : 0;
      const rawFee = amount * feeRate + (currency === 'NGN' ? 100 : 0); // ₦100 flat fee for NGN
      const processingFee = Math.min(rawFee, 2000); // capped at ₦2,000
      const netAmount = amount - processingFee;

      // Persist payment record
      await Payment.create({
        tenant_id: tenant_id || null,
        invoice_id: invoice_id || null,
        amount,
        currency,
        payment_method: PaymentMethod.ONLINE,
        payment_status: PaymentStatus.PENDING,
        payment_date: new Date(),
        reference_number: reference,
        payment_processor: payment_provider,
        processing_fee_rate: feeRate,
        processing_fee_amount: processingFee,
        net_amount: netAmount,
        created_by,
        notes: appointment_id ? `Appointment: ${appointment_id}` : undefined
      } as any);

      // Cache for 30 minutes (handles delayed verification)
      await saveToRedis(`payment:ref:${reference}`, JSON.stringify({ reference, invoice_id, email }), 1800);

      return paystackResult;
    } catch (error) {
      console.error('Payment initiation error:', error);
      return { statusCode: 500, status: 'error', message: 'Payment initiation failed', data: null };
    }
  },

  /**
   * Verify a payment by reference (called from callback URL or manually).
   * Updates the Payment record and linked Invoice in the database.
   */
  verifyPayment: async (reference: string): Promise<PaymentResponse> => {
    try {
      if (!reference) {
        return { statusCode: 400, status: 'error', message: 'Reference is required', data: null };
      }

      const payment = await Payment.findOne({
        where: { reference_number: reference },
        include: [{ model: Invoice, as: 'invoice' }]
      });

      if (!payment) {
        return { statusCode: 404, status: 'error', message: 'Payment record not found', data: null };
      }

      // Already verified — return current state
      if (payment.payment_status === PaymentStatus.COMPLETED) {
        return { statusCode: 200, status: 'success', message: 'Payment already verified', data: payment };
      }

      const provider = payment.payment_processor || 'paystack';
      const verificationResult = await paymentProcessorFactory.verifyPayment(reference, provider);

      if (verificationResult.statusCode === 200 && verificationResult.status === 'success') {
        // Mark payment as completed — this also updates the linked invoice
        await payment.markAsCompleted(
          verificationResult.data?.reference || reference,
          verificationResult.data
        );

        // Create a paper-trail invoice if payment had none — non-fatal
        try {
          const { autoCreateInvoiceForPayment } = await import('./invoice-auto.service');
          await autoCreateInvoiceForPayment(payment);
        } catch (invoiceError) {
          console.error('Auto-invoice creation failed (non-fatal):', invoiceError);
        }

        // Send branded receipt email — non-fatal
        try {
          const { sendPaymentReceiptEmail } = await import('./payment-email.service');
          await sendPaymentReceiptEmail(payment);
        } catch (emailError) {
          console.error('Receipt email failed (non-fatal):', emailError);
        }

        // Cache result for 1 hour
        await saveToRedis(`payment:verify:${reference}`, JSON.stringify(verificationResult), 3600);

        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified and recorded',
          data: {
            reference,
            amount: payment.amount,
            currency: (payment as any).currency || 'NGN',
            status: 'completed',
            invoice_id: payment.invoice_id,
            payment_date: payment.payment_date
          }
        };
      }

      // Mark as failed if verification says so
      if (verificationResult.status === 'failed') {
        await payment.markAsFailed('Payment verification returned failed status');
      }

      return verificationResult;
    } catch (error) {
      console.error('Payment verification error:', error);
      return { statusCode: 500, status: 'error', message: 'Payment verification failed', data: null };
    }
  },

  /**
   * Handle Paystack webhook — persists charge.success to the database.
   * Must respond quickly (Paystack retries on timeout).
   */
  handleWebhookEvent: async (signature: string, body: string | Buffer, provider: string): Promise<PaymentResponse> => {
    try {
      if (!signature) {
        return { statusCode: 400, status: 'error', message: 'Missing signature', data: null };
      }

      const webhookResult = await paymentProcessorFactory.handleWebhookEvent(signature, body, provider);

      // ── Application routing ────────────────────────────────────────────────
      // The payment account is shared across Opright applications, so a large
      // share of inbound events belong to a sibling app. Filter BEFORE the
      // idempotency record and before any persistence: recording another app's
      // event would burn the key and mask a later legitimate delivery.
      const ownership = classifyWebhookOwnership(webhookResult.data?.application_id);

      if (ownership === 'other') {
        return {
          statusCode: 200,
          status: 'ignored',
          message: 'Event belongs to another application',
          data: null
        };
      }

      if (ownership === 'unknown') {
        // No application id: a legacy transaction, or a sibling app that does
        // not stamp one. Treat the event as ours only if we hold the reference.
        const reference = webhookResult.data?.reference;
        const known = reference
          ? await Payment.findOne({ where: { reference_number: reference }, attributes: ['id'] })
          : null;

        if (!known) {
          console.warn(
            `[webhook] ${provider} event with no application_id and unknown reference ` +
            `${reference ?? '(none)'} — ignoring.`
          );
          return {
            statusCode: 200,
            status: 'ignored',
            message: 'Event not recognised by this application',
            data: null
          };
        }
      }

      // Idempotency: skip an event we've already recorded (a re-delivered
      // charge.success must not double-apply). Keyed by outcome + reference.
      if (webhookResult.data?.reference && (webhookResult.status === 'success' || webhookResult.status === 'failed')) {
        const eventKey = `${webhookResult.status}:${webhookResult.data.reference}`;
        const isNew = await WebhookEvent.recordOnce(provider, eventKey, webhookResult.status);
        if (!isNew) {
          return { statusCode: 200, status: 'success', message: 'Duplicate event ignored', data: webhookResult.data };
        }
      }

      // NOTE: only the Paystack branch persists to the DB below. Stripe and
      // Flutterwave webhooks are signature-verified by the factory but their
      // DB persistence is not yet wired — treat them as experimental.

      // Persist the outcome for successful Paystack charges
      if (
        provider === 'paystack' &&
        webhookResult.status === 'success' &&
        webhookResult.data?.reference
      ) {
        const { reference } = webhookResult.data;
        const payment = await Payment.findOne({
          where: { reference_number: reference },
          include: [{ model: Invoice, as: 'invoice' }]
        });

        if (payment && payment.payment_status !== PaymentStatus.COMPLETED) {
          await payment.markAsCompleted(reference, webhookResult.data);
        }
      }

      if (
        provider === 'paystack' &&
        webhookResult.status === 'failed' &&
        webhookResult.data?.reference
      ) {
        const payment = await Payment.findOne({ where: { reference_number: webhookResult.data.reference } });
        if (payment) {
          await payment.markAsFailed('Paystack charge.failed event received');
        }
      }

      return webhookResult;
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { statusCode: 500, status: 'error', message: 'Failed to process webhook', data: null };
    }
  },

  getAllPayments: async (params: FetchPaymentsRequestData & { tenant_id?: string }): Promise<AllPaymentsResponse> => {
    try {
      let { pageNumber = 1, limitNumber = 10 } = params;
      if (pageNumber < 1) pageNumber = 1;
      if (limitNumber < 1) limitNumber = 10;

      const { count, rows: payments } = await Payment.findAndCountAll({
        where: params.tenant_id ? { tenant_id: params.tenant_id } : {},
        include: [{ model: Invoice, as: 'invoice' }],
        order: [['createdAt', 'DESC']],
        offset: (pageNumber - 1) * limitNumber,
        limit: limitNumber,
        paranoid: true
      });

      return {
        statusCode: 200,
        status: 'success',
        message: 'Payments retrieved successfully',
        data: { payments, total: count, page: pageNumber, limit: limitNumber }
      };
    } catch (error) {
      console.error('Error retrieving payments:', error);
      return { statusCode: 500, status: 'error', message: 'Failed to retrieve payments', data: null };
    }
  },

  getPaymentById: async (paymentId: string): Promise<AllPaymentsResponse> => {
    try {
      if (!paymentId) return { statusCode: 400, status: 'error', message: 'Payment ID is required', data: null };

      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Invoice, as: 'invoice' }]
      });

      if (!payment) return { statusCode: 404, status: 'error', message: 'Payment not found', data: null };

      return { statusCode: 200, status: 'success', message: 'Payment retrieved', data: payment };
    } catch (error) {
      return { statusCode: 500, status: 'error', message: 'Failed to retrieve payment', data: null };
    }
  },

  getPaymentByReference: async (reference: string): Promise<AllPaymentsResponse> => {
    try {
      if (!reference) return { statusCode: 400, status: 'error', message: 'Reference is required', data: null };

      const payment = await Payment.findOne({
        where: { reference_number: reference },
        include: [{ model: Invoice, as: 'invoice' }]
      });

      if (!payment) return { statusCode: 404, status: 'error', message: 'Payment not found', data: null };

      return { statusCode: 200, status: 'success', message: 'Payment retrieved', data: payment };
    } catch (error) {
      return { statusCode: 500, status: 'error', message: 'Failed to retrieve payment', data: null };
    }
  },

  processRefund: async (paymentId: string, amount?: number, reason?: string): Promise<PaymentResponse> => {
    try {
      if (!paymentId) return { statusCode: 400, status: 'error', message: 'Payment ID is required', data: null };

      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Invoice, as: 'invoice' }]
      });

      if (!payment) return { statusCode: 404, status: 'error', message: 'Payment not found', data: null };
      if (payment.payment_status !== PaymentStatus.COMPLETED) {
        return { statusCode: 400, status: 'error', message: 'Only completed payments can be refunded', data: null };
      }

      const reference = payment.reference_number;
      if (!reference) {
        return { statusCode: 400, status: 'error', message: 'No transaction reference on this payment', data: null };
      }

      const refundResult = await paymentProcessorFactory.createRefund(
        reference,
        payment.payment_processor || 'paystack',
        amount
      );

      if (refundResult.statusCode === 200) {
        await payment.processRefund(amount, reason);
      }

      return refundResult;
    } catch (error) {
      console.error('Refund error:', error);
      return { statusCode: 500, status: 'error', message: 'Refund processing failed', data: null };
    }
  }
};
