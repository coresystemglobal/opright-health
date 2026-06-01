import { PaymentRequestData, PaymentResponse } from '@appTypes/payment.types';
import stripeService from '@modules/billing/providers/stripe.service';

import paystackService from '@modules/billing/providers/paystack.service';

import flutterwaveService from '@modules/billing/providers/flutterwave.service';


/**
 * Payment Processor Factory Service
 * Provides a unified interface for interacting with different payment processors
 */
class PaymentProcessorFactory {
  /**
   * Get the appropriate payment processor based on the provider
   */
  getProcessor(paymentProvider: string) {
    switch (paymentProvider.toLowerCase()) {
      case 'stripe':
        return stripeService;
      case 'paystack':
        return paystackService;
      case 'flutterwave':
        return flutterwaveService;
      default:
        throw new Error(`Unsupported payment provider: ${paymentProvider}`);
    }
  }

  /**
   * Initialize payment with the selected provider
   */
  async initiatePayment(paymentData: PaymentRequestData): Promise<PaymentResponse> {
    try {
      const processor = this.getProcessor(paymentData.payment_provider);
      return await processor.initiatePayment(paymentData);
    } catch (error) {
      console.error('Payment initiation error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: `Failed to initiate payment with ${paymentData.payment_provider}`,
        data: null
      };
    }
  }

  /**
   * Verify payment with the selected provider
   */
  async verifyPayment(reference: string, paymentProvider: string): Promise<PaymentResponse> {
    try {
      const processor = this.getProcessor(paymentProvider);
      return await processor.verifyPayment(reference);
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: `Failed to verify payment with ${paymentProvider}`,
        data: null
      };
    }
  }

  /**
   * Process webhook event for the selected provider
   */
  async handleWebhookEvent(signature: string, rawBody: string | Buffer, paymentProvider: string): Promise<PaymentResponse> {
    try {
      const processor = this.getProcessor(paymentProvider);
      
      // All processors handle both string and Buffer types
      return await processor.handleWebhookEvent(signature, rawBody as any);
    } catch (error) {
      console.error('Webhook handling error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: `Failed to process webhook for ${paymentProvider}`,
        data: null
      };
    }
  }

  /**
   * Process refund for the selected provider
   */
  async createRefund(reference: string, paymentProvider: string, amount?: number): Promise<PaymentResponse> {
    try {
      const processor = this.getProcessor(paymentProvider);
      return await processor.createRefund(reference, amount);
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: `Failed to process refund with ${paymentProvider}`,
        data: null
      };
    }
  }
}

export default new PaymentProcessorFactory();