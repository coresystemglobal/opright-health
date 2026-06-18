import axios from 'axios';
import crypto from 'crypto';
import { PaymentRequestData, PaymentResponse } from '@appTypes/payment.types';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30_000
});

/**
 * Paystack — primary payment gateway (NGN: cards, bank transfer, USSD).
 * Amounts are sent to Paystack in kobo (amount * 100).
 */
const paystackService = {
  async initiatePayment(paymentData: PaymentRequestData & { metadata?: Record<string, unknown> }): Promise<PaymentResponse> {
    try {
      const callbackUrl = process.env.PAYSTACK_CALLBACK_URL
        || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/payments/paystack/callback`;

      const response = await paystackClient.post('/transaction/initialize', {
        email: paymentData.email,
        amount: Math.round(paymentData.amount * 100),
        currency: paymentData.currency || 'NGN',
        callback_url: callbackUrl,
        metadata: paymentData.metadata || {}
      });

      const { status, message, data } = response.data;

      if (!status) {
        return { statusCode: 400, status: 'error', message: message || 'Paystack initialization failed', data: null };
      }

      return {
        statusCode: 200,
        status: 'success',
        message: 'Payment initialized',
        data: {
          authorization_url: data.authorization_url,
          access_code: data.access_code,
          reference: data.reference
        }
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Paystack initialization failed';
      console.error('Paystack initiation error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  },

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const response = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);
      const { status, message, data } = response.data;

      if (!status) {
        return { statusCode: 400, status: 'error', message: message || 'Verification failed', data: null };
      }

      if (data.status === 'success') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified',
          data: {
            reference: data.reference,
            amount: data.amount / 100,
            currency: data.currency,
            paid_at: data.paid_at,
            channel: data.channel,
            customer_email: data.customer?.email,
            card_last_four: data.authorization?.last4,
            card_brand: data.authorization?.brand,
            bank: data.authorization?.bank
          }
        };
      }

      if (data.status === 'failed') {
        return { statusCode: 200, status: 'failed', message: data.gateway_response || 'Payment failed', data: { reference: data.reference } };
      }

      return { statusCode: 200, status: 'pending', message: `Payment status: ${data.status}`, data: { reference: data.reference } };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Paystack verification failed';
      console.error('Paystack verification error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  },

  /**
   * Validates x-paystack-signature (HMAC SHA512 of raw body with secret key)
   * and normalizes charge events.
   */
  async handleWebhookEvent(signature: string, rawBody: string | Buffer): Promise<PaymentResponse> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return { statusCode: 500, status: 'error', message: 'Paystack secret key not configured', data: null };
    }

    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const expectedSignature = crypto.createHmac('sha512', secret).update(bodyString).digest('hex');

    // timingSafeEqual throws on length mismatch, so compare lengths first
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return { statusCode: 401, status: 'error', message: 'Invalid webhook signature', data: null };
    }

    let event: any;
    try {
      event = JSON.parse(bodyString);
    } catch {
      return { statusCode: 400, status: 'error', message: 'Invalid webhook payload', data: null };
    }

    switch (event.event) {
      case 'charge.success':
        return {
          statusCode: 200,
          status: 'success',
          message: 'Charge successful',
          data: {
            reference: event.data.reference,
            amount: event.data.amount / 100,
            currency: event.data.currency,
            paid_at: event.data.paid_at,
            channel: event.data.channel,
            customer_email: event.data.customer?.email
          }
        };

      case 'charge.failed':
        return {
          statusCode: 200,
          status: 'failed',
          message: event.data.gateway_response || 'Charge failed',
          data: { reference: event.data.reference }
        };

      case 'refund.processed':
        return {
          statusCode: 200,
          status: 'refunded',
          message: 'Refund processed',
          data: { reference: event.data.transaction_reference, refund_amount: event.data.amount / 100 }
        };

      default:
        // Acknowledge unhandled events so Paystack stops retrying
        return { statusCode: 200, status: 'ignored', message: `Unhandled event: ${event.event}`, data: null };
    }
  },

  async createRefund(reference: string, amount?: number): Promise<PaymentResponse> {
    try {
      const payload: Record<string, unknown> = { transaction: reference };
      if (amount) payload.amount = Math.round(amount * 100);

      const response = await paystackClient.post('/refund', payload);
      const { status, message, data } = response.data;

      if (!status) {
        return { statusCode: 400, status: 'error', message: message || 'Refund failed', data: null };
      }

      return {
        statusCode: 200,
        status: 'success',
        message: 'Refund initiated',
        data: { reference, refund_status: data.status, refund_amount: data.amount ? data.amount / 100 : amount }
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Paystack refund failed';
      console.error('Paystack refund error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  }
};

export default paystackService;
