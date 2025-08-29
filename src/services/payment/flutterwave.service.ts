import axios from 'axios';
import crypto from 'crypto';
import { PaymentRequestData } from '../../types/payment.types';

// Define types for Flutterwave responses
interface FlutterwaveSuccessResponse {
  status: string;
  message: string;
  data: {
    link?: string;
    id?: string;
    tx_ref?: string;
    amount?: number;
    currency?: string;
    status?: string;
    payment_type?: string;
    customer?: any;
  };
}

/**
 * Flutterwave Payment Processor Service
 */
class FlutterwavePaymentProcessor {
  private secretKey: string;
  private publicKey: string;
  private baseUrl: string = 'https://api.flutterwave.com/v3';

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY as string;
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY as string;
  }

  /**
   * Initialize a payment with Flutterwave
   */
  async initiatePayment(paymentData: PaymentRequestData) {
    try {
      const { amount, email, currency } = paymentData;

      // Generate a unique transaction reference
      const txRef = `FLW-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const requestBody = {
        tx_ref: txRef,
        amount,
        currency: currency || 'NGN',
        redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL,
        customer: {
          email
        },
        customizations: {
          title: 'Hospital Management Payment',
          logo: process.env.LOGO_URL,
          description: 'Payment for medical services'
        },
        meta: {
          payment_provider: 'flutterwave'
        }
      };

      const response = await axios.post(`${this.baseUrl}/payments`, requestBody, config);

      if (response.data.status === 'success') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Flutterwave payment initiated successfully',
          data: {
            authorization_url: response.data.data.link,
            reference: txRef
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Failed to initiate Flutterwave payment',
          data: response.data
        };
      }
    } catch (error) {
      console.error('Flutterwave payment initiation error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to initiate Flutterwave payment',
        data: null
      };
    }
  }

  /**
   * Verify a Flutterwave payment
   */
  async verifyPayment(transactionId: string) {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(`${this.baseUrl}/transactions/${transactionId}/verify`, config);

      if (response.data.status === 'success' && response.data.data.status === 'successful') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified successfully',
          data: {
            transaction_id: response.data.data.id,
            tx_ref: response.data.data.tx_ref,
            amount: response.data.data.amount,
            currency: response.data.data.currency,
            status: response.data.data.status,
            payment_type: response.data.data.payment_type,
            customer: response.data.data.customer
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Payment verification failed',
          data: response.data
        };
      }
    } catch (error) {
      console.error('Flutterwave payment verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to verify Flutterwave payment',
        data: null
      };
    }
  }

  /**
   * Verify a Flutterwave transaction by reference
   */
  async verifyTransactionByReference(txRef: string) {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(`${this.baseUrl}/transactions/verify_by_reference?tx_ref=${txRef}`, config);

      if (response.data.status === 'success' && response.data.data.status === 'successful') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment verified successfully',
          data: {
            transaction_id: response.data.data.id,
            tx_ref: response.data.data.tx_ref,
            amount: response.data.data.amount,
            currency: response.data.data.currency,
            status: response.data.data.status,
            payment_type: response.data.data.payment_type,
            customer: response.data.data.customer
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Payment verification failed',
          data: response.data
        };
      }
    } catch (error) {
      console.error('Flutterwave reference verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to verify Flutterwave transaction',
        data: null
      };
    }
  }

  /**
   * Handle Flutterwave webhook events
   */
  async handleWebhookEvent(signature: string, rawBody: string) {
    try {
      const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
      
      if (signature !== secretHash) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Invalid signature',
          data: null
        };
      }

      const event = JSON.parse(rawBody);
      
      if (event.event === 'charge.completed') {
        // Check if transaction was successful
        const isSuccessful = event.data.status === 'successful';
        
        return {
          statusCode: 200,
          status: isSuccessful ? 'success' : 'failed',
          message: isSuccessful ? 'Payment succeeded' : 'Payment failed',
          data: {
            transaction_id: event.data.id,
            tx_ref: event.data.tx_ref,
            amount: event.data.amount,
            currency: event.data.currency,
            status: event.data.status,
            payment_type: event.data.payment_type
          }
        };
      } else {
        return {
          statusCode: 200,
          status: 'ignored',
          message: `Unhandled event type: ${event.event}`,
          data: null
        };
      }
    } catch (error) {
      console.error('Flutterwave webhook handling error:', error);
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
  async createRefund(transactionId: string, amount?: number) {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const requestBody: any = {
        id: transactionId
      };

      // If amount specified, include it in the refund
      if (amount) {
        requestBody.amount = amount;
      }

      const response = await axios.post(`${this.baseUrl}/transactions/${transactionId}/refund`, requestBody, config);

      if (response.data.status === 'success') {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Refund initiated successfully',
          data: {
            refund_id: response.data.data.id,
            amount: response.data.data.amount,
            status: response.data.data.status,
            transaction_id: transactionId
          }
        };
      } else {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Failed to initiate refund',
          data: response.data
        };
      }
    } catch (error) {
      console.error('Flutterwave refund error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to process refund',
        data: null
      };
    }
  }
}

export default new FlutterwavePaymentProcessor();