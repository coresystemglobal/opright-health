import express from 'express';
const paymentRouter = express.Router();

import { Router, Request as ExpressRequest, Response } from 'express';
import paymentController from '../payment/payment.controller';

paymentRouter.post("/initiate", async (req: ExpressRequest, res: Response) => {
  await paymentController.initiatePayment(req, res);
});

paymentRouter.get("/verify/:reference", async (req: ExpressRequest, res: Response) => {
  await paymentController.verifyPayment(req, res);
});

paymentRouter.get("/all", 
  async (req: ExpressRequest, res: Response) => {
  await paymentController.getAllPayments(req, res);
});

paymentRouter.get("/id/:paymentId",
  async (req: ExpressRequest, res: Response) => {
  await paymentController.getPaymentById(req, res);
});

paymentRouter.get("/ref/:reference",
  async (req: ExpressRequest, res: Response) => {
  await paymentController.getPaymentByReference(req, res);
});

export default paymentRouter;
