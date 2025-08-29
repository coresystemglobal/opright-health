import { Invoice, Patient, User, Appointment } from '../models';
import { PaginationQuery } from '../types/common.types';
import { PaginationUtil } from '../utils/pagination.util';
import { ValidationUtil } from '../utils/validation.util';

// Define PaymentStatus enum locally to avoid conflicts
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

interface CreateInvoiceData {
  patient_id: string;
  appointment_id?: string;
  total_amount: number;
  payment_status: PaymentStatus;
  due_date: Date;
  items: InvoiceItem[];
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface UpdateInvoiceData {
  total_amount?: number;
  payment_status?: PaymentStatus;
  due_date?: Date;
  items?: InvoiceItem[];
  balance?: number;
}

export const invoiceService = {
  getAllInvoices: async (paginationQuery: PaginationQuery, status?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build filter conditions
      const whereConditions: any = {};
      
      if (status) {
        whereConditions.payment_status = status;
      }

      const { count, rows: invoices } = await Invoice.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            model: Appointment,
            as: 'appointment'
          }
        ],
        order: [['created_at', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        invoices,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all invoices error:', error);
      throw error;
    }
  },

  getInvoiceById: async (invoiceId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            model: Appointment,
            as: 'appointment'
          }
        ]
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      console.error('Get invoice by ID error:', error);
      throw error;
    }
  },

  getPatientInvoices: async (patientId: string, paginationQuery: PaginationQuery, status?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build filter conditions
      const whereConditions: any = {
        patient_id: patientId
      };
      
      if (status) {
        whereConditions.payment_status = status;
      }

      const { count, rows: invoices } = await Invoice.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Appointment,
            as: 'appointment'
          }
        ],
        order: [['created_at', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        invoices,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get patient invoices error:', error);
      throw error;
    }
  },

  createInvoice: async (invoiceData: CreateInvoiceData) => {
    try {
      const { 
        patient_id, 
        appointment_id, 
        total_amount, 
        payment_status,
        due_date,
        items
      } = invoiceData;

      if (!patient_id || !total_amount || !payment_status || !due_date || !items) {
        throw new Error('Patient ID, total amount, payment status, due date, and items are required');
      }

      if (!ValidationUtil.isValidUUID(patient_id)) {
        throw new Error('Invalid patient ID format');
      }

      if (appointment_id && !ValidationUtil.isValidUUID(appointment_id)) {
        throw new Error('Invalid appointment ID format');
      }

      // Validate due date is not in the past
      const now = new Date();
      if (new Date(due_date) < now) {
        throw new Error('Due date must be in the future');
      }

      // Validate items
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Invoice must have at least one item');
      }

      let calculatedTotal = 0;
      for (const item of items) {
        if (!item.description || item.quantity <= 0 || item.unit_price <= 0) {
          throw new Error('Invoice items must have description, quantity, and unit price');
        }
        
        // Calculate amount for each item
        item.amount = item.quantity * item.unit_price;
        calculatedTotal += item.amount;
      }

      // Ensure total amount matches calculated total
      if (Math.abs(calculatedTotal - total_amount) > 0.01) {
        throw new Error('Total amount does not match sum of invoice items');
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const invoice = await Invoice.create({
        patient_id,
        appointment_id: appointment_id || null,
        invoice_number: invoiceNumber,
        invoice_date: new Date(),
        due_date,
        total_amount,
        payment_status,
        items,
        paid_amount: 0,
        balance: total_amount
      });

      return invoice;
    } catch (error) {
      console.error('Create invoice error:', error);
      throw error;
    }
  },

  updateInvoice: async (invoiceId: string, updateData: UpdateInvoiceData) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      const invoice = await Invoice.findByPk(invoiceId);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Check if invoice can be updated
      if (invoice.payment_status === PaymentStatus.PAID) {
        throw new Error('Paid invoices cannot be updated');
      }

      // Validate due date if provided
      if (updateData.due_date) {
        const now = new Date();
        if (new Date(updateData.due_date) < now) {
          throw new Error('Due date must be in the future');
        }
      }

      // Validate items if provided
      if (updateData.items) {
        if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
          throw new Error('Invoice must have at least one item');
        }

        let calculatedTotal = 0;
        for (const item of updateData.items) {
          if (!item.description || item.quantity <= 0 || item.unit_price <= 0) {
            throw new Error('Invoice items must have description, quantity, and unit price');
          }
          
          // Calculate amount for each item
          item.amount = item.quantity * item.unit_price;
          calculatedTotal += item.amount;
        }

        // If total amount is provided, ensure it matches calculated total
        if (updateData.total_amount !== undefined && 
            Math.abs(calculatedTotal - updateData.total_amount) > 0.01) {
          throw new Error('Total amount does not match sum of invoice items');
        } else {
          // Otherwise, update the total amount based on items
          updateData.total_amount = calculatedTotal;
        }

        // Update balance
        updateData['balance'] = updateData.total_amount - invoice.paid_amount;
      } else if (updateData.total_amount !== undefined) {
        // If only total amount is updated, update balance
        updateData['balance'] = updateData.total_amount - invoice.paid_amount;
      }

      await invoice.update(updateData);

      return invoice;
    } catch (error) {
      console.error('Update invoice error:', error);
      throw error;
    }
  },

  recordPayment: async (invoiceId: string, amount: number, paymentReference?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      if (!amount || amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const invoice = await Invoice.findByPk(invoiceId);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.payment_status === PaymentStatus.CANCELLED) {
        throw new Error('Cannot record payment for cancelled invoice');
      }

      if (invoice.payment_status === PaymentStatus.PAID) {
        throw new Error('Invoice is already paid in full');
      }

      // Calculate new paid amount and balance
      const newPaidAmount = invoice.paid_amount + amount;
      const newBalance = invoice.total_amount - newPaidAmount;

      // Update payment status
      let newPaymentStatus: PaymentStatus = invoice.payment_status;
      if (newBalance <= 0) {
        newPaymentStatus = PaymentStatus.PAID;
      } else if (newPaidAmount > 0) {
        newPaymentStatus = PaymentStatus.PARTIAL;
      }

      // Record payment transaction
      const paymentTransaction = {
        date: new Date(),
        amount: amount,
        reference: paymentReference || `PAY-${Date.now()}`,
        method: 'online' // Default method
      };

      // Get existing transactions or initialize empty array
      const transactions = (invoice as any).payment_transactions || [];
      
      // Add new transaction
      transactions.push(paymentTransaction);

      await invoice.update({
        paid_amount: newPaidAmount,
        balance: Math.max(0, newBalance),
        payment_status: newPaymentStatus,
        payment_transactions: transactions
      });

      return invoice;
    } catch (error) {
      console.error('Record payment error:', error);
      throw error;
    }
  },

  cancelInvoice: async (invoiceId: string, reason: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      if (!reason) {
        throw new Error('Cancellation reason is required');
      }

      const invoice = await Invoice.findByPk(invoiceId);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.payment_status === PaymentStatus.PAID) {
        throw new Error('Paid invoices cannot be cancelled');
      }

      if (invoice.payment_status === PaymentStatus.CANCELLED) {
        throw new Error('Invoice is already cancelled');
      }

      await invoice.update({
        payment_status: PaymentStatus.CANCELLED,
        cancellation_reason: reason,
        cancelled_at: new Date()
      });

      return invoice;
    } catch (error) {
      console.error('Cancel invoice error:', error);
      throw error;
    }
  },

  deleteInvoice: async (invoiceId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(invoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      const invoice = await Invoice.findByPk(invoiceId);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.payment_status === PaymentStatus.PAID) {
        throw new Error('Paid invoices cannot be deleted');
      }

      // Soft delete
      await invoice.destroy();

      return true;
    } catch (error) {
      console.error('Delete invoice error:', error);
      throw error;
    }
  }
};