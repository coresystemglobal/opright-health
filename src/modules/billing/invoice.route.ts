import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import invoiceController from './invoice.controller';

const invoiceRouter = express.Router();

invoiceRouter.get("/", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getAllInvoices(req, res);
});

invoiceRouter.get("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getInvoiceById(req, res);
});

invoiceRouter.get("/patient/:patientId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getPatientInvoices(req, res);
});

invoiceRouter.post("/", async (req: ExpressRequest, res: Response) => {
  await invoiceController.createInvoice(req, res);
});

invoiceRouter.put("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.updateInvoice(req, res);
});

invoiceRouter.post("/:invoiceId/payment", async (req: ExpressRequest, res: Response) => {
  await invoiceController.recordPayment(req, res);
});

invoiceRouter.patch("/:invoiceId/cancel", async (req: ExpressRequest, res: Response) => {
  await invoiceController.cancelInvoice(req, res);
});

invoiceRouter.delete("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.deleteInvoice(req, res);
});

export default invoiceRouter;
