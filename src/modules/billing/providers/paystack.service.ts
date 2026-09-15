import axios from 'axios';
import crypto from 'crypto';
import { PaymentRequestData } from '@appTypes/payment.types';
import { applicationId } from '@config/application.config';
import { timingSafeEqualStr } from '@utils/secure-compare.util';

// Define types for Paystack responses
interface PaystackSuccessResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
    status?: string;
    amount?: number;
    paid_at?: string;
    channel?: string;
    currency?: string;
    customer?: any;
    transaction?: {
      reference: string;
    };
    id?: string;
  };
}

/**
 * Paystack Payment Processor Service
 */
class PaystackPaymentProcessor {
  private secretKey: string;
  private baseUrl: string = 'https://api.paystack.co';

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY as string;
  }

  /**
   * Initialize a payment with Paystack
   */
  async initiatePayment(paymentData: PaymentRequestData) {
    try {
      const { amount, email, currency } = paymentData;

      // Generate a unique reference
      const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const requestBody = {
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        currency: currency || 'NGN',
        reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.API_BASE_URL}/api/payments/paystack/callback`,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        metadata: {
          payment_provider: 'paystack',
          custom_fields: [
            { display_name: 'Platform', variable_name: 'platform', value: 'MediCore HMS' }
          ],
          ...(paymentData as any).metadata,
          // Stamped LAST so caller-supplied metadata can never overwrite it:
          // the shared Paystack account routes webhooks on this value.
          application_id: applicationId()
        }
      };

      const response = await axios.post(`${this.baseUrl}/transaction/initialize`, requestBody, config);

      const responseData = response.data as PaystackSuccessResponse;
      
      if (responseData.status) {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Paystack payment initiated successfully',
          data: {
            authorization_url: responseData.data.authorization_url,
            access_code: responseData.data.access_code,
            reference: responseData.data.reference
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Failed to initiate Paystack payment',
          data: responseData
        };
      }
    } catch (error) {
      console.error('Paystack payment initiation error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to initiate Paystack payment',
        data: null
      };
    }
  }

  /**
   * Verify a Paystack payment
   */
  async verifyPayment(reference: string) {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, config);

      const responseData = response.data as PaystackSuccessResponse;
      
      if (responseData.status && responseData.data.status === 'success') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified successfully',
          data: {
            reference: responseData.data.reference,
            amount: (responseData.data.amount || 0) / 100,
            status: responseData.data.status,
            payment_date: responseData.data.paid_at,
            channel: responseData.data.channel,
            currency: responseData.data.currency,
            customer: responseData.data.customer
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Payment verification failed',
          data: responseData
        };
      }
    } catch (error) {
      console.error('Paystack payment verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to verify Paystack payment',
        data: null
      };
    }
  }

  /**
   * Handle Paystack webhook events
   */
  async handleWebhookEvent(signature: string, rawBody: string) {
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(rawBody)
        .digest('hex');

      // Constant-time: a plain !== leaks how much of the digest matched.
      if (!timingSafeEqualStr(hash, signature)) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Invalid signature',
          data: null
        };
      }

      const event = JSON.parse(rawBody);
      
      switch (event.event) {
        case 'charge.success':
          return {
            statusCode: 200,
            status: 'success',
            message: 'Payment succeeded',
            data: {
              reference: event.data.reference,
              amount: event.data.amount / 100,
              status: event.data.status,
              channel: event.data.channel,
              application_id: event.data.metadata?.application_id || null,
              transaction_purpose: event.data.metadata?.transaction_purpose || null,
              invoice_id: event.data.metadata?.invoice_id || null,
              appointment_id: event.data.metadata?.appointment_id || null,
              created_by: event.data.metadata?.created_by || null,
              metadata: event.data.metadata
            }
          };

        case 'charge.failed':
          // Handle failed payment
          return {
            statusCode: 400,
            status: 'failed',
            message: 'Payment failed',
            data: {
              reference: event.data.reference,
              amount: event.data.amount / 100,
              status: event.data.status,
              channel: event.data.channel,
              application_id: event.data.metadata?.application_id || null
            }
          };

        default:
          return {
            statusCode: 200,
            status: 'ignored',
            message: `Unhandled event type: ${event.event}`,
            data: null
          };
      }
    } catch (error) {
      console.error('Paystack webhook handling error:', error);
      return {
        statusCode: 400,
        status: 'error',
        message: 'Webhook error',
        data: null
      };
    }
  }

  /**
   * Create a refund for a transaction
   */
  async createRefund(reference: string, amount?: number) {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const requestBody: any = {
        transaction: reference
      };

      // If amount specified, include it in the refund
      if (amount) {
        requestBody.amount = Math.round(amount * 100); // Convert to kobo
      }

      const response = await axios.post(`${this.baseUrl}/refund`, requestBody, config);

      const responseData = response.data as PaystackSuccessResponse;
      
      if (responseData.status) {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Refund initiated successfully',
          data: {
            refund_id: responseData.data.id,
            amount: (responseData.data.amount || 0) / 100,
            status: responseData.data.status,
            transaction_reference: responseData.data.transaction?.reference
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Failed to initiate refund',
          data: responseData
        };
      }
    } catch (error) {
      console.error('Paystack refund error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to process refund',
        data: null
      };
    }
  }

  // ── Subscription support ──────────────────────────────────────────────────
  private authConfig() {
    return { headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } };
  }

  /** Create (or fetch) a Paystack customer; returns the customer_code. */
  async createCustomer(email: string, first_name?: string, phone?: string): Promise<string | null> {
    try {
      const res = await axios.post(`${this.baseUrl}/customer`, { email, first_name, phone }, this.authConfig());
      const data = res.data as PaystackSuccessResponse;
      return data.status ? (data.data as any).customer_code : null;
    } catch (error) {
      console.error('Paystack createCustomer error:', error);
      return null;
    }
  }

  /**
   * Initialize a subscription transaction: charges the customer for the plan and
   * (on success) Paystack creates the recurring subscription automatically.
   * Returns the checkout authorization_url + reference.
   */
  async initializeSubscription(email: string, planCode: string, metadata: Record<string, unknown> = {}) {
    try {
      const body: any = {
        email,
        plan: planCode,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.API_BASE_URL}/api/payments/paystack/callback`,
        metadata
      };
      const res = await axios.post(`${this.baseUrl}/transaction/initialize`, body, this.authConfig());
      const data = res.data as PaystackSuccessResponse;
      if (!data.status) return { statusCode: 400, status: 'error', message: 'Failed to initialize subscription', data };
      return {
        statusCode: 200,
        status: 'success',
        message: 'Subscription checkout initialized',
        data: { authorization_url: data.data.authorization_url, reference: data.data.reference, access_code: data.data.access_code }
      };
    } catch (error) {
      console.error('Paystack initializeSubscription error:', error);
      return { statusCode: 500, status: 'error', message: 'Failed to initialize subscription', data: null };
    }
  }

  /** Fetch a subscription (needed to get the email_token required to disable it). */
  async fetchSubscription(subscriptionCode: string): Promise<any | null> {
    try {
      const res = await axios.get(`${this.baseUrl}/subscription/${subscriptionCode}`, this.authConfig());
      const data = res.data as PaystackSuccessResponse;
      return data.status ? data.data : null;
    } catch (error) {
      console.error('Paystack fetchSubscription error:', error);
      return null;
    }
  }

  /** Disable (cancel) a subscription. Fetches the email_token if not supplied. */
  async disableSubscription(subscriptionCode: string, emailToken?: string): Promise<boolean> {
    try {
      let token = emailToken;
      if (!token) {
        const sub = await this.fetchSubscription(subscriptionCode);
        token = sub?.email_token;
      }
      if (!token) return false;
      const res = await axios.post(`${this.baseUrl}/subscription/disable`, { code: subscriptionCode, token }, this.authConfig());
      return !!(res.data as PaystackSuccessResponse).status;
    } catch (error) {
      console.error('Paystack disableSubscription error:', error);
      return false;
    }
  }

  /** Re-enable a previously disabled subscription. */
  async enableSubscription(subscriptionCode: string, emailToken?: string): Promise<boolean> {
    try {
      let token = emailToken;
      if (!token) {
        const sub = await this.fetchSubscription(subscriptionCode);
        token = sub?.email_token;
      }
      if (!token) return false;
      const res = await axios.post(`${this.baseUrl}/subscription/enable`, { code: subscriptionCode, token }, this.authConfig());
      return !!(res.data as PaystackSuccessResponse).status;
    } catch (error) {
      console.error('Paystack enableSubscription error:', error);
      return false;
    }
  }
}

export default new PaystackPaymentProcessor();