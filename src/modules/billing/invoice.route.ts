import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import invoiceController from './invoice.controller';
import { Invoice } from './invoice.model';
import { Patient } from '@modules/patients/patient.model';
import { Doctor } from '@modules/doctors/doctor.model';
import { Hospital } from '@modules/hospital/hospital.model';
import { generateInvoicePdf } from './pdf-invoice.service';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';

// Invoices are authenticated and tenant-scoped (previously fully open).
const invoiceRouter = express.Router();
invoiceRouter.use(authentication, tenantMiddleware);

const tenantOf = (req: ExpressRequest): string =>
  (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);

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

// Download invoice as PDF
invoiceRouter.get("/:invoiceId/pdf", async (req: ExpressRequest, res: Response) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.invoiceId, tenant_id: tenantOf(req) },
      include: [
        { model: Patient, as: 'patient' },
        { model: Doctor,  as: 'doctor'  }
      ]
    });

    if (!invoice) {
      res.status(404).json({ status: 'error', message: 'Invoice not found' });
      return;
    }

    // Best-effort: the invoice's own tenant's hospital for the header.
    const hospital = await Hospital.findOne({ where: { tenant_id: (invoice as any).tenant_id } }).catch(() => null);

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
