import axios from 'axios';
import crypto from 'crypto';
import { PaymentRequestData, PaymentResponse } from '@appTypes/payment.types';

const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

const flutterwaveClient = axios.create({
  baseURL: FLUTTERWAVE_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30_000
});

/**
 * Flutterwave — alternative gateway for broader African coverage.
 * Amounts are sent in major units (not kobo).
 */
const flutterwaveService = {
  async initiatePayment(paymentData: PaymentRequestData & { metadata?: Record<string, unknown> }): Promise<PaymentResponse> {
    try {
      const txRef = `HMS-FLW-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const redirectUrl = process.env.FLUTTERWAVE_REDIRECT_URL
        || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/payments/flutterwave/callback`;

      const response = await flutterwaveClient.post('/payments', {
        tx_ref: txRef,
        amount: paymentData.amount,
        currency: paymentData.currency || 'NGN',
        redirect_url: redirectUrl,
        customer: { email: paymentData.email },
        meta: paymentData.metadata || {}
      });

      const { status, message, data } = response.data;

      if (status !== 'success') {
        return { statusCode: 400, status: 'error', message: message || 'Flutterwave initialization failed', data: null };
      }

      return {
        statusCode: 200,
        status: 'success',
        message: 'Payment initialized',
        data: {
          authorization_url: data.link,
          reference: txRef
        }
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Flutterwave initialization failed';
      console.error('Flutterwave initiation error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  },

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const response = await flutterwaveClient.get('/transactions/verify_by_reference', {
        params: { tx_ref: reference }
      });

      const { status, message, data } = response.data;

      if (status !== 'success' || !data) {
        return { statusCode: 400, status: 'error', message: message || 'Verification failed', data: null };
      }

      if (data.status === 'successful') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified',
          data: {
            reference: data.tx_ref,
            flw_transaction_id: data.id,
            amount: data.amount,
            currency: data.currency,
            paid_at: data.created_at,
            channel: data.payment_type,
            customer_email: data.customer?.email
          }
        };
      }

      if (data.status === 'failed') {
        return { statusCode: 200, status: 'failed', message: data.processor_response || 'Payment failed', data: { reference: data.tx_ref } };
      }

      return { statusCode: 200, status: 'pending', message: `Payment status: ${data.status}`, data: { reference: data.tx_ref } };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Flutterwave verification failed';
      console.error('Flutterwave verification error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  },

  /**
   * Flutterwave sends a verif-hash header that must equal the configured
   * secret hash (not an HMAC — direct comparison per their docs).
   */
  async handleWebhookEvent(signature: string, rawBody: string | Buffer): Promise<PaymentResponse> {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    if (!secretHash) {
      return { statusCode: 500, status: 'error', message: 'Flutterwave webhook hash not configured', data: null };
    }

    if (signature !== secretHash) {
      return { statusCode: 401, status: 'error', message: 'Invalid webhook signature', data: null };
    }

    let event: any;
    try {
      const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      event = typeof bodyString === 'string' ? JSON.parse(bodyString) : bodyString;
    } catch {
      return { statusCode: 400, status: 'error', message: 'Invalid webhook payload', data: null };
    }

    if (event.event === 'charge.completed') {
      const data = event.data;
      if (data.status === 'successful') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Charge successful',
          data: {
            reference: data.tx_ref,
            flw_transaction_id: data.id,
            amount: data.amount,
            currency: data.currency,
            customer_email: data.customer?.email
          }
        };
      }
      return { statusCode: 200, status: 'failed', message: data.processor_response || 'Charge failed', data: { reference: data.tx_ref } };
    }

    return { statusCode: 200, status: 'ignored', message: `Unhandled event: ${event.event}`, data: null };
  },

  async createRefund(reference: string, amount?: number): Promise<PaymentResponse> {
    try {
      // Flutterwave refunds require the numeric transaction id — resolve from reference
      const verification = await flutterwaveClient.get('/transactions/verify_by_reference', {
        params: { tx_ref: reference }
      });

      const transactionId = verification.data?.data?.id;
      if (!transactionId) {
        return { statusCode: 404, status: 'error', message: 'Transaction not found for refund', data: null };
      }

      const response = await flutterwaveClient.post(`/transactions/${transactionId}/refund`, amount ? { amount } : {});
      const { status, message, data } = response.data;

      if (status !== 'success') {
        return { statusCode: 400, status: 'error', message: message || 'Refund failed', data: null };
      }

      return {
        statusCode: 200,
        status: 'success',
        message: 'Refund initiated',
        data: { reference, refund_status: data?.status, refund_amount: data?.amount_refunded ?? amount }
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Flutterwave refund failed';
      console.error('Flutterwave refund error:', message);
      return { statusCode: 502, status: 'error', message, data: null };
    }
  }
};

export default flutterwaveService;
