import Stripe from 'stripe';
import { PaymentRequestData, PaymentResponse } from '@appTypes/payment.types';

/**
 * Stripe Payment Processor Service
 */
class StripePaymentProcessor {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2023-10-16'
    });
  }

  /**
   * Initialize a payment with Stripe
   */
  async initiatePayment(paymentData: PaymentRequestData) {
    try {
      const { amount, email, currency } = paymentData;
      
      // Create a payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit (cents)
        currency: currency.toLowerCase(),
        receipt_email: email,
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          email,
          payment_provider: 'stripe'
        }
      });

      return {
        statusCode: 200,
        status: 'success',
        message: 'Stripe payment initiated successfully',
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          reference: paymentIntent.id
        }
      };
    } catch (error) {
      console.error('Stripe payment initiation error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to initiate Stripe payment',
        data: null
      };
    }
  }

  /**
   * Verify a Stripe payment
   */
  async verifyPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'Payment intent not found',
          data: null
        };
      }

      // Check payment status
      const isSuccessful = paymentIntent.status === 'succeeded';
      
      return {
        statusCode: 200,
        status: isSuccessful ? 'success' : 'pending',
        message: isSuccessful ? 'Payment verified successfully' : 'Payment is still processing',
        data: {
          payment_intent: paymentIntent,
          status: paymentIntent.status,
          amount_received: paymentIntent.amount_received / 100, // Convert back to currency units
          payment_method: paymentIntent.payment_method_types[0]
        }
      };
    } catch (error) {
      console.error('Stripe payment verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to verify Stripe payment',
        data: null
      };
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(signature: string, rawBody: Buffer | string): Promise<PaymentResponse> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      // Ensure rawBody is Buffer type for Stripe
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
      
      const event = this.stripe.webhooks.constructEvent(
        bodyBuffer,
        signature,
        webhookSecret
      );

      let paymentIntent;
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          paymentIntent = event.data.object as Stripe.PaymentIntent;
          // Handle successful payment
          return {
            statusCode: 200,
            status: 'success',
            message: 'Payment succeeded',
            data: {
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              status: paymentIntent.status,
              metadata: paymentIntent.metadata
            }
          };

        case 'payment_intent.payment_failed':
          paymentIntent = event.data.object as Stripe.PaymentIntent;
          // Handle failed payment
          return {
            statusCode: 400,
            status: 'failed',
            message: 'Payment failed',
            data: {
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              status: paymentIntent.status,
              error: paymentIntent.last_payment_error
            }
          };

        default:
          return {
            statusCode: 200,
            status: 'ignored',
            message: `Unhandled event type: ${event.type}`,
            data: null
          };
      }
    } catch (error) {
      console.error('Stripe webhook handling error:', error);
      return {
        statusCode: 400,
        status: 'error',
        message: 'Webhook error',
        data: null
      };
    }
  }

  /**
   * Create a refund for a payment
   */
  async createRefund(paymentIntentId: string, amount?: number) {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId
      };

      // If amount specified, include it in the refund
      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to smallest currency unit
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        statusCode: 200,
        status: 'success',
        message: 'Refund processed successfully',
        data: {
          refund_id: refund.id,
          amount: refund.amount / 100,
          status: refund.status
        }
      };
    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to process refund',
        data: null
      };
    }
  }
}

export default new StripePaymentProcessor();