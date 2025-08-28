import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import invoiceController from '../controllers/invoice.controller';

const invoiceRouter = express.Router();

// Get all invoices with optional filtering (status)
invoiceRouter.get("/", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getAllInvoices(req, res);
});

// Get invoice by ID
invoiceRouter.get("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getInvoiceById(req, res);
});

// Get invoices for a specific patient
invoiceRouter.get("/patient/:patientId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getPatientInvoices(req, res);
});

// Create a new invoice
invoiceRouter.post("/", async (req: ExpressRequest, res: Response) => {
  await invoiceController.createInvoice(req, res);
});

// Update an invoice
invoiceRouter.put("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.updateInvoice(req, res);
});

// Record a payment for an invoice
invoiceRouter.post("/:invoiceId/payment", async (req: ExpressRequest, res: Response) => {
  await invoiceController.recordPayment(req, res);
});

// Cancel an invoice
invoiceRouter.patch("/:invoiceId/cancel", async (req: ExpressRequest, res: Response) => {
  await invoiceController.cancelInvoice(req, res);
});

// Delete an invoice (soft delete)
invoiceRouter.delete("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.deleteInvoice(req, res);
});

export default invoiceRouter;