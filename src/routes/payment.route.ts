import express from 'express';
const paymentRouter = express.Router();

import { Router, Request as ExpressRequest, Response } from 'express';
import paymentController from '../controllers/payment.controller';
import { validate, validateParams, validateQuery, paymentValidation, genericValidation } from '../utils/validator';

paymentRouter.post("/initiate", 
  validate(paymentValidation.initiate),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.initiatePayment(req, res);
  }
);

paymentRouter.get("/verify/:reference", 
  validateParams(paymentValidation.verify),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.verifyPayment(req, res);
  }
);

paymentRouter.get("/all", 
  validateQuery(genericValidation.pagination),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.getAllPayments(req, res);
  }
);

paymentRouter.get("/id/:paymentId",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.getPaymentById(req, res);
  }
);

paymentRouter.get("/ref/:reference",
  validateParams(paymentValidation.verify),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.getPaymentByReference(req, res);
  }
);

// Refund endpoint
paymentRouter.post("/refund/:paymentId", 
  validateParams(genericValidation.id),
  validate(paymentValidation.refund),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.processRefund(req, res);
  }
);

// Webhook endpoints
paymentRouter.post("/webhook/stripe", 
  express.raw({ type: 'application/json' }),
  async (req: ExpressRequest, res: Response) => {
    await paymentController.stripeWebhook(req, res);
  }
);

paymentRouter.post("/webhook/paystack", async (req: ExpressRequest, res: Response) => {
  await paymentController.paystackWebhook(req, res);
});

paymentRouter.post("/webhook/flutterwave", async (req: ExpressRequest, res: Response) => {
  await paymentController.flutterwaveWebhook(req, res);
});

export default paymentRouter;
