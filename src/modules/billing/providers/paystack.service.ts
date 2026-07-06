import axios from 'axios';
import crypto from 'crypto';
import { PaymentRequestData } from '@appTypes/payment.types';

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
          ...(paymentData as any).metadata
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

      if (hash !== signature) {
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
          // Handle successful payment
          return {
            statusCode: 200,
            status: 'success',
            message: 'Payment succeeded',
            data: {
              reference: event.data.reference,
              amount: event.data.amount / 100,
              status: event.data.status,
              channel: event.data.channel,
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
              channel: event.data.channel
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
}

export default new PaystackPaymentProcessor();