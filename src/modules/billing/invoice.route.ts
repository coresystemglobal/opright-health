import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import invoiceController from './invoice.controller';

const invoiceRouter = express.Router();

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List all invoices
 *     description: Returns invoices with optional filtering by status
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, partially_paid, cancelled, overdue]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Invoices retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
invoiceRouter.get("/", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getAllInvoices(req, res);
});

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
invoiceRouter.get("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getInvoiceById(req, res);
});

/**
 * @swagger
 * /invoices/patient/{patientId}:
 *   get:
 *     summary: Get invoices for a patient
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient invoices retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
invoiceRouter.get("/patient/:patientId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.getPatientInvoices(req, res);
});

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - items
 *             properties:
 *               patient_id:
 *                 type: string
 *                 format: uuid
 *               appointment_id:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - quantity
 *                     - unit_price
 *                   properties:
 *                     description:
 *                       type: string
 *                       example: Consultation fee
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *                     unit_price:
 *                       type: number
 *                       example: 15000
 *               due_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 */
invoiceRouter.post("/", async (req: ExpressRequest, res: Response) => {
  await invoiceController.createInvoice(req, res);
});

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   put:
 *     summary: Update an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               due_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [draft, sent]
 *     responses:
 *       200:
 *         description: Invoice updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 */
invoiceRouter.put("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.updateInvoice(req, res);
});

/**
 * @swagger
 * /invoices/{invoiceId}/payment:
 *   post:
 *     summary: Record a manual payment for an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - payment_method
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 15000
 *               payment_method:
 *                 type: string
 *                 enum: [cash, bank_transfer, card]
 *                 example: cash
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
invoiceRouter.post("/:invoiceId/payment", async (req: ExpressRequest, res: Response) => {
  await invoiceController.recordPayment(req, res);
});

/**
 * @swagger
 * /invoices/{invoiceId}/cancel:
 *   patch:
 *     summary: Cancel an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Invoice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
invoiceRouter.patch("/:invoiceId/cancel", async (req: ExpressRequest, res: Response) => {
  await invoiceController.cancelInvoice(req, res);
});

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   delete:
 *     summary: Soft delete an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
invoiceRouter.delete("/:invoiceId", async (req: ExpressRequest, res: Response) => {
  await invoiceController.deleteInvoice(req, res);
});

export default invoiceRouter;
