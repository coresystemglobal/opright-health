import Stripe from 'stripe';
import { PaymentRequestData, PaymentResponse } from '@appTypes/payment.types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16'
});

// Currencies Stripe treats as zero-decimal (no minor unit conversion)
const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw', 'vnd', 'clp', 'pyg', 'rwf', 'ugx', 'xaf', 'xof']);

const toMinorUnit = (amount: number, currency: string): number =>
  ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? Math.round(amount) : Math.round(amount * 100);

const fromMinorUnit = (amount: number, currency: string): number =>
  ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? amount : amount / 100;

/**
 * Stripe — fallback gateway for international (non-NGN) payments.
 * Uses Stripe Checkout Sessions; the session ID doubles as our reference.
 */
const stripeService = {
  async initiatePayment(paymentData: PaymentRequestData & { metadata?: Record<string, unknown> }): Promise<PaymentResponse> {
    try {
      const currency = (paymentData.currency || 'USD').toLowerCase();
      const successUrl = process.env.STRIPE_SUCCESS_URL
        || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = process.env.STRIPE_CANCEL_URL
        || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancelled`;

      const metadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(paymentData.metadata || {})) {
        if (value !== null && value !== undefined) metadata[key] = String(value);
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: paymentData.email,
        line_items: [{
          price_data: {
            currency,
            product_data: { name: 'Hospital Management System payment' },
            unit_amount: toMinorUnit(paymentData.amount, currency)
          },
          quantity: 1
        }],
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl
      });

      return {
        statusCode: 200,
        status: 'success',
        message: 'Payment initialized',
        data: {
          authorization_url: session.url,
          reference: session.id
        }
      };
    } catch (error) {
      const message = error instanceof Stripe.errors.StripeError ? error.message : 'Stripe initialization failed';
      console.error('Stripe initiation error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  },

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const session = await stripe.checkout.sessions.retrieve(reference);
      const currency = session.currency || 'usd';

      if (session.payment_status === 'paid') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified',
          data: {
            reference: session.id,
            amount: fromMinorUnit(session.amount_total || 0, currency),
            currency: currency.toUpperCase(),
            customer_email: session.customer_details?.email,
            payment_intent: session.payment_intent
          }
        };
      }

      if (session.status === 'expired') {
        return { statusCode: 200, status: 'failed', message: 'Checkout session expired', data: { reference } };
      }

      return { statusCode: 200, status: 'pending', message: `Payment status: ${session.payment_status}`, data: { reference } };
    } catch (error) {
      const message = error instanceof Stripe.errors.StripeError ? error.message : 'Stripe verification failed';
      console.error('Stripe verification error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  },

  /**
   * Verifies stripe-signature on the raw request body and normalizes events.
   * Requires the webhook route to use express.raw().
   */
  async handleWebhookEvent(signature: string, rawBody: string | Buffer): Promise<PaymentResponse> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { statusCode: 500, status: 'error', message: 'Stripe webhook secret not configured', data: null };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid webhook signature';
      return { statusCode: 401, status: 'error', message, data: null };
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const currency = session.currency || 'usd';
        return {
          statusCode: 200,
          status: 'success',
          message: 'Checkout completed',
          data: {
            reference: session.id,
            amount: fromMinorUnit(session.amount_total || 0, currency),
            currency: currency.toUpperCase(),
            customer_email: session.customer_details?.email
          }
        };
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        return { statusCode: 200, status: 'failed', message: 'Checkout session expired', data: { reference: session.id } };
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        return {
          statusCode: 200,
          status: 'refunded',
          message: 'Charge refunded',
          data: {
            reference: charge.payment_intent,
            refund_amount: fromMinorUnit(charge.amount_refunded, charge.currency)
          }
        };
      }

      default:
        return { statusCode: 200, status: 'ignored', message: `Unhandled event: ${event.type}`, data: null };
    }
  },

  async createRefund(reference: string, amount?: number): Promise<PaymentResponse> {
    try {
      // Reference is a Checkout Session id — resolve its payment intent first
      const session = await stripe.checkout.sessions.retrieve(reference);
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

      if (!paymentIntentId) {
        return { statusCode: 400, status: 'error', message: 'No payment intent found for this session', data: null };
      }

      const currency = session.currency || 'usd';
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        ...(amount ? { amount: toMinorUnit(amount, currency) } : {})
      });

      return {
        statusCode: 200,
        status: 'success',
        message: 'Refund initiated',
        data: {
          reference,
          refund_id: refund.id,
          refund_status: refund.status,
          refund_amount: fromMinorUnit(refund.amount, refund.currency)
        }
      };
    } catch (error) {
      const message = error instanceof Stripe.errors.StripeError ? error.message : 'Stripe refund failed';
      console.error('Stripe refund error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  }
};

export default stripeService;
