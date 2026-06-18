import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import invoiceController from '../controllers/invoice.controller';
import { Invoice } from '../models/invoice.model';
import { Patient } from '../models/patient.model';
import { Doctor } from '../modules/doctors/doctor.model';
import { Hospital } from '../models/hospital.model';
import { generateInvoicePdf } from '../services/pdf-invoice.service';

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

// Download invoice as PDF
invoiceRouter.get("/:invoiceId/pdf", async (req: ExpressRequest, res: Response) => {
  try {
    const invoice = await Invoice.findByPk(req.params.invoiceId, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Doctor,  as: 'doctor'  }
      ]
    });

    if (!invoice) {
      res.status(404).json({ status: 'error', message: 'Invoice not found' });
      return;
    }

    // Best-effort: fetch the first hospital record for the header
    const hospital = await Hospital.findOne().catch(() => null);

    const pdfBuffer = await generateInvoicePdf({ invoice: invoice as any, hospital });

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
      'Content-Length':      pdfBuffer.length.toString()
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate PDF' });
  }
});

export default invoiceRouter;