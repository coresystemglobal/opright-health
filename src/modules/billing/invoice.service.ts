import { Invoice, Patient, User, Appointment } from '../../models';
import { PaymentStatus, InvoiceType } from '@modules/billing/invoice.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
}

interface CreateInvoiceData {
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  invoice_type?: InvoiceType;
  due_date: Date;
  items: InvoiceItem[];
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  billing_address?: string;
}

interface UpdateInvoiceData {
  due_date?: Date;
  items?: InvoiceItem[];
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
}

/** Sum items, filling each item's amount. */
function priceItems(items: InvoiceItem[]): number {
  let subtotal = 0;
  for (const item of items) {
    if (!item.description || item.quantity <= 0 || item.unit_price <= 0) {
      throw new Error('Invoice items must have description, quantity, and unit price');
    }
    item.amount = item.quantity * item.unit_price;
    subtotal += item.amount;
  }
  return subtotal;
}

export const invoiceService = {
  getAllInvoices: async (paginationQuery: PaginationQuery, tenantId: string, status?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
      const whereConditions: any = { tenant_id: tenantId };
      if (status) whereConditions.payment_status = status;

      const { count, rows: invoices } = await Invoice.findAndCountAll({
        where: whereConditions,
        include: [
          { model: Patient, as: 'patient', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }] },
          { model: Appointment, as: 'appointment' }
        ],
        order: [['created_at', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return { invoices, count, page: paginationOptions.page, limit: paginationOptions.limit };
    } catch (error) {
      console.error('Get all invoices error:', error);
      throw error;
    }
  },

  getInvoiceById: async (invoiceId: string, tenantId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) throw new Error('Invalid invoice ID format');

      const invoice = await Invoice.findOne({
        where: { id: invoiceId, tenant_id: tenantId },
        include: [
          { model: Patient, as: 'patient', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }] },
          { model: Appointment, as: 'appointment' }
        ]
      });

      if (!invoice) throw new Error('Invoice not found');
      return invoice;
    } catch (error) {
      console.error('Get invoice by ID error:', error);
      throw error;
    }
  },

  getPatientInvoices: async (patientId: string, tenantId: string, paginationQuery: PaginationQuery, status?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
      const whereConditions: any = { patient_id: patientId, tenant_id: tenantId };
      if (status) whereConditions.payment_status = status;

      const { count, rows: invoices } = await Invoice.findAndCountAll({
        where: whereConditions,
        include: [{ model: Appointment, as: 'appointment' }],
        order: [['created_at', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return { invoices, count, page: paginationOptions.page, limit: paginationOptions.limit };
    } catch (error) {
      console.error('Get patient invoices error:', error);
      throw error;
    }
  },

  createInvoice: async (invoiceData: CreateInvoiceData, tenantId: string) => {
    try {
      const { patient_id, doctor_id, appointment_id, invoice_type, due_date, items, tax_rate = 0, discount_amount = 0, notes, billing_address } = invoiceData;

      if (!patient_id || !doctor_id || !due_date || !items) {
        throw new Error('patient_id, doctor_id, due_date and items are required');
      }
      if (!ValidationUtil.isValidUUID(patient_id)) throw new Error('Invalid patient ID format');
      if (!ValidationUtil.isValidUUID(doctor_id)) throw new Error('Invalid doctor ID format');
      if (appointment_id && !ValidationUtil.isValidUUID(appointment_id)) throw new Error('Invalid appointment ID format');
      if (new Date(due_date) < new Date()) throw new Error('Due date must be in the future');
      if (!Array.isArray(items) || items.length === 0) throw new Error('Invoice must have at least one item');

      const subtotal = priceItems(items);
      const taxAmount = subtotal * tax_rate;
      const totalAmount = subtotal + taxAmount - discount_amount;

      // Explicit numeric fields satisfy not-null validation (runs before the
      // BeforeCreate hook, which then recomputes tax/total consistently).
      const invoice = await Invoice.create({
        tenant_id: tenantId,
        patient_id,
        doctor_id,
        appointment_id: appointment_id || null,
        invoice_type: invoice_type || InvoiceType.OTHER,
        subtotal,
        tax_rate,
        tax_amount: taxAmount,
        discount_amount,
        total_amount: totalAmount,
        paid_amount: 0,
        payment_status: PaymentStatus.PENDING,
        invoice_date: new Date(),
        due_date,
        line_items: items,
        notes: notes || null,
        billing_address: billing_address || null
      } as any);

      return invoice;
    } catch (error) {
      console.error('Create invoice error:', error);
      throw error;
    }
  },

  updateInvoice: async (invoiceId: string, tenantId: string, updateData: UpdateInvoiceData) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) throw new Error('Invalid invoice ID format');

      const invoice = await Invoice.findOne({ where: { id: invoiceId, tenant_id: tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.payment_status === PaymentStatus.PAID) throw new Error('Paid invoices cannot be updated');

      if (updateData.due_date && new Date(updateData.due_date) < new Date()) {
        throw new Error('Due date must be in the future');
      }

      const patch: any = {};
      if (updateData.due_date) patch.due_date = updateData.due_date;
      if (updateData.notes !== undefined) patch.notes = updateData.notes;

      if (updateData.items) {
        if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
          throw new Error('Invoice must have at least one item');
        }
        const subtotal = priceItems(updateData.items);
        const taxRate = updateData.tax_rate ?? parseFloat((invoice as any).tax_rate?.toString() || '0');
        const discount = updateData.discount_amount ?? parseFloat((invoice as any).discount_amount?.toString() || '0');
        patch.line_items = updateData.items;
        patch.subtotal = subtotal;
        patch.tax_rate = taxRate;
        patch.tax_amount = subtotal * taxRate;
        patch.discount_amount = discount;
        patch.total_amount = subtotal + (subtotal * taxRate) - discount;
      }

      await invoice.update(patch);
      return invoice;
    } catch (error) {
      console.error('Update invoice error:', error);
      throw error;
    }
  },

  recordPayment: async (invoiceId: string, tenantId: string, amount: number) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) throw new Error('Invalid invoice ID format');
      if (!amount || amount <= 0) throw new Error('Payment amount must be greater than zero');

      const invoice = await Invoice.findOne({ where: { id: invoiceId, tenant_id: tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.payment_status === PaymentStatus.CANCELLED) throw new Error('Cannot record payment for cancelled invoice');
      if (invoice.payment_status === PaymentStatus.PAID) throw new Error('Invoice is already paid in full');

      // Model method advances paid_amount + status (PARTIAL/PAID) and saves.
      await invoice.addPayment(amount);
      return invoice;
    } catch (error) {
      console.error('Record payment error:', error);
      throw error;
    }
  },

  cancelInvoice: async (invoiceId: string, tenantId: string, reason: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) throw new Error('Invalid invoice ID format');
      if (!reason) throw new Error('Cancellation reason is required');

      const invoice = await Invoice.findOne({ where: { id: invoiceId, tenant_id: tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.payment_status === PaymentStatus.CANCELLED) throw new Error('Invoice is already cancelled');

      const existingNotes = (invoice as any).notes ? `${(invoice as any).notes}\n` : '';
      invoice.set('notes', `${existingNotes}Cancelled: ${reason}`);
      // Model method sets status CANCELLED (throws if there are payments) and saves.
      await invoice.cancel();
      return invoice;
    } catch (error) {
      console.error('Cancel invoice error:', error);
      throw error;
    }
  },

  deleteInvoice: async (invoiceId: string, tenantId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) throw new Error('Invalid invoice ID format');

      const invoice = await Invoice.findOne({ where: { id: invoiceId, tenant_id: tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.payment_status === PaymentStatus.PAID) throw new Error('Paid invoices cannot be deleted');

      await invoice.destroy();
      return true;
    } catch (error) {
      console.error('Delete invoice error:', error);
      throw error;
    }
  }
};
