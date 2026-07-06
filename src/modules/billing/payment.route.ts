import express, { Request, Response } from 'express';
import paymentController from './payment.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, validateQuery, paymentValidation, genericValidation } from '@utils/validator';

const paymentRouter = express.Router();

paymentRouter.get('/paystack/callback', async (req: Request, res: Response) => {
  await paymentController.paystackCallback(req, res);
});

paymentRouter.post('/initiate',
  authentication,
  validate(paymentValidation.initiate),
  async (req: Request, res: Response) => {
    await paymentController.initiatePayment(req, res);
  }
);

paymentRouter.get('/verify/:reference',
  authentication,
  async (req: Request, res: Response) => {
    await paymentController.verifyPayment(req, res);
  }
);

paymentRouter.get('/all',
  authentication,
  validateQuery(genericValidation.pagination),
  async (req: Request, res: Response) => {
    await paymentController.getAllPayments(req, res);
  }
);

paymentRouter.get('/id/:paymentId',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await paymentController.getPaymentById(req, res);
  }
);

paymentRouter.get('/ref/:reference',
  authentication,
  async (req: Request, res: Response) => {
    await paymentController.getPaymentByReference(req, res);
  }
);

paymentRouter.post('/refund/:paymentId',
  authentication,
  validateParams(genericValidation.id),
  validate(paymentValidation.refund),
  async (req: Request, res: Response) => {
    await paymentController.processRefund(req, res);
  }
);

paymentRouter.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    await paymentController.stripeWebhook(req, res);
  }
);

paymentRouter.post('/webhook/paystack', async (req: Request, res: Response) => {
  await paymentController.paystackWebhook(req, res);
});

paymentRouter.post('/webhook/flutterwave', async (req: Request, res: Response) => {
  await paymentController.flutterwaveWebhook(req, res);
});

export default paymentRouter;
