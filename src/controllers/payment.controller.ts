import { Request as ExpressRequest, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { ResponseUtil } from '../utils/response.util';

/**
 * Payment controller for handling payment operations
 */
const paymentController = {
  /**
   * Initiate a payment
   */
  initiatePayment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const paymentResult = await paymentService.initiatePayment(req.body);
      return res.status(paymentResult.statusCode).json(paymentResult);
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to initiate payment', 500, [errorMessage]);
    }
  },

  /**
   * Verify a payment
   */
  verifyPayment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { reference } = req.params;
      const verificationResult = await paymentService.verifyPayment({ reference });
      
      return res.status(verificationResult.statusCode).json(verificationResult);
    } catch (error) {
      if (error instanceof Error && error.message === 'Reference is required') {
        return ResponseUtil.validationError(res, ['Reference is required']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to verify payment', 500, [errorMessage]);
    }
  },

  /**
   * Get all payments
   */
  getAllPayments: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const payments = await paymentService.getAllPayments({ pageNumber: page, limitNumber: limit });
      
      return res.status(payments.statusCode).json(payments);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve payments', 500, [errorMessage]);
    }
  },

  /**
   * Get payment by ID
   */
  getPaymentById: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentById(paymentId);
      
      return res.status(payment.statusCode).json(payment);
    } catch (error) {
      if (error instanceof Error && error.message === 'Payment ID is required') {
        return ResponseUtil.validationError(res, ['Payment ID is required']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve payment', 500, [errorMessage]);
    }
  },

  /**
   * Get payment by reference
   */
  getPaymentByReference: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { reference } = req.params;
      const payment = await paymentService.getPaymentByReference(reference);
      
      return res.status(payment.statusCode).json(payment);
    } catch (error) {
      if (error instanceof Error && error.message === 'Reference is required') {
        return ResponseUtil.validationError(res, ['Reference is required']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve payment', 500, [errorMessage]);
    }
  },
  
  /**
   * Process a refund
   */
  processRefund: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      
      const refundResult = await paymentService.processRefund(paymentId, amount, reason);
      return res.status(refundResult.statusCode).json(refundResult);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Payment ID is required') {
          return ResponseUtil.validationError(res, ['Payment ID is required']);
        } else if (error.name === 'ValidationError') {
          return ResponseUtil.validationError(res, [error.message]);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to process refund', 500, [errorMessage]);
    }
  },

  /**
   * Handle Stripe webhook
   */
  stripeWebhook: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const rawBody = req.body;
      
      const webhookResult = await paymentService.handleWebhookEvent(signature, rawBody, 'stripe');
      return res.status(webhookResult.statusCode).json(webhookResult);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing signature') {
        return ResponseUtil.validationError(res, ['Missing Stripe signature']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Webhook processing error', 500, [errorMessage]);
    }
  },

  /**
   * Handle Paystack webhook
   */
  paystackWebhook: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const rawBody = JSON.stringify(req.body);
      
      const webhookResult = await paymentService.handleWebhookEvent(signature, rawBody, 'paystack');
      return res.status(webhookResult.statusCode).json(webhookResult);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing signature') {
        return ResponseUtil.validationError(res, ['Missing Paystack signature']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Webhook processing error', 500, [errorMessage]);
    }
  },

  /**
   * Handle Flutterwave webhook
   */
  flutterwaveWebhook: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const signature = req.headers['verif-hash'] as string;
      const rawBody = JSON.stringify(req.body);
      
      const webhookResult = await paymentService.handleWebhookEvent(signature, rawBody, 'flutterwave');
      return res.status(webhookResult.statusCode).json(webhookResult);
    } catch (error) {
      if (error instanceof Error && error.message === 'Missing signature') {
        return ResponseUtil.validationError(res, ['Missing Flutterwave verification hash']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Webhook processing error', 500, [errorMessage]);
    }
  }
};

export default paymentController;