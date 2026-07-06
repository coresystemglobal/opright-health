import { Request, Response } from 'express';
import { paymentService } from '@modules/billing/payment.service';

import { ResponseUtil } from '@utils/response.util';

const paymentController = {
  initiatePayment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      const result = await paymentService.initiatePayment({
        ...req.body,
        created_by: userId
      });

      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to initiate payment', 500, [msg]);
    }
  },

  verifyPayment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { reference } = req.params;
      const result = await paymentService.verifyPayment(reference);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to verify payment', 500, [msg]);
    }
  },

  /**
   * Paystack callback — Paystack redirects here after card payment.
   * Verifies the transaction and redirects the user to the frontend.
   */
  paystackCallback: async (req: Request, res: Response): Promise<void> => {
    const { reference, trxref } = req.query;
    const ref = (reference || trxref) as string;

    if (!ref) {
      res.redirect(`${process.env.FRONTEND_URL}/payments?status=error&message=missing_reference`);
      return;
    }

    try {
      const result = await paymentService.verifyPayment(ref);

      if (result.statusCode === 200 && result.status === 'success') {
        res.redirect(`${process.env.FRONTEND_URL}/payments?status=success&reference=${ref}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payments?status=failed&reference=${ref}`);
      }
    } catch {
      res.redirect(`${process.env.FRONTEND_URL}/payments?status=error&reference=${ref}`);
    }
  },

  getAllPayments: async (req: Request, res: Response): Promise<Response> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await paymentService.getAllPayments({ pageNumber: page, limitNumber: limit });
      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve payments', 500, [msg]);
    }
  },

  getPaymentById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { paymentId } = req.params;
      const result = await paymentService.getPaymentById(paymentId);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve payment', 500, [msg]);
    }
  },

  getPaymentByReference: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { reference } = req.params;
      const result = await paymentService.getPaymentByReference(reference);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve payment', 500, [msg]);
    }
  },

  processRefund: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const result = await paymentService.processRefund(paymentId, amount, reason);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to process refund', 500, [msg]);
    }
  },

  paystackWebhook: async (req: Request, res: Response): Promise<Response> => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      // Use the exact bytes Paystack signed — JSON.stringify(req.body) may differ
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await paymentService.handleWebhookEvent(signature, rawBody, 'paystack');
      // Paystack expects a 200 OK immediately — always return 200
      return res.status(200).json({ received: true });
    } catch (error) {
      return res.status(200).json({ received: true }); // still 200 to stop retries
    }
  },

  stripeWebhook: async (req: Request, res: Response): Promise<Response> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const result = await paymentService.handleWebhookEvent(signature, (req as any).rawBody || req.body, 'stripe');
      return res.status(result.statusCode).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Webhook processing error', 500, [msg]);
    }
  },

  flutterwaveWebhook: async (req: Request, res: Response): Promise<Response> => {
    try {
      const signature = req.headers['verif-hash'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await paymentService.handleWebhookEvent(signature, rawBody, 'flutterwave');
      return res.status(200).json({ received: true });
    } catch (error) {
      return res.status(200).json({ received: true });
    }
  }
};

export default paymentController;
