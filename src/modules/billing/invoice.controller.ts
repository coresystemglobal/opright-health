import { Request as ExpressRequest, Response } from 'express';
import { invoiceService } from '@modules/billing/invoice.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: ExpressRequest): string =>
  (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);

/**
 * Invoice controller for handling invoice operations
 */
const invoiceController = {
  /**
   * Get all invoices with optional filtering
   */
  getAllInvoices: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { status, page = '1', limit = '10' } = req.query;
      
      const paginationQuery: PaginationQuery = {
        page: page as string,
        limit: limit as string
      };

      const result = await invoiceService.getAllInvoices(paginationQuery, tenantOf(req), status as string);

      return ResponseUtil.success(res, {
        invoices: result.invoices,
        pagination: {
          total: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.count / result.limit)
        }
      }, 'Invoices retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve invoices', 500, [errorMessage]);
    }
  },

  /**
   * Get invoice by ID
   */
  getInvoiceById: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { invoiceId } = req.params;

      if (!invoiceId) {
        return ResponseUtil.validationError(res, ['Invoice ID is required']);
      }

      const invoice = await invoiceService.getInvoiceById(invoiceId, tenantOf(req));
      
      return ResponseUtil.success(res, invoice, 'Invoice retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return ResponseUtil.notFound(res, 'Invoice not found');
      }
      
      if (error instanceof Error && error.message === 'Invalid invoice ID format') {
        return ResponseUtil.validationError(res, ['Invalid invoice ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve invoice', 500, [errorMessage]);
    }
  },

  /**
   * Get invoices for a specific patient
   */
  getPatientInvoices: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { status, page = '1', limit = '10' } = req.query;

      if (!patientId) {
        return ResponseUtil.validationError(res, ['Patient ID is required']);
      }

      const paginationQuery: PaginationQuery = {
        page: page as string,
        limit: limit as string
      };

      const result = await invoiceService.getPatientInvoices(
        patientId,
        tenantOf(req),
        paginationQuery,
        status as string
      );

      return ResponseUtil.success(res, {
        invoices: result.invoices,
        pagination: {
          total: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.count / result.limit)
        }
      }, 'Patient invoices retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid patient ID format') {
        return ResponseUtil.validationError(res, ['Invalid patient ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve patient invoices', 500, [errorMessage]);
    }
  },

  /**
   * Create a new invoice
   */
  createInvoice: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const invoiceData = req.body;
      
      if (!invoiceData.patient_id || !invoiceData.total_amount || 
          !invoiceData.payment_status || !invoiceData.due_date || !invoiceData.items) {
        return ResponseUtil.validationError(res, [
          'Patient ID, total amount, payment status, due date, and items are required'
        ]);
      }

      const invoice = await invoiceService.createInvoice(invoiceData, tenantOf(req));
      
      return ResponseUtil.success(res, invoice, 'Invoice created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('does not match')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to create invoice', 500, [errorMessage]);
    }
  },

  /**
   * Update an invoice
   */
  updateInvoice: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { invoiceId } = req.params;
      const updateData = req.body;

      if (!invoiceId) {
        return ResponseUtil.validationError(res, ['Invoice ID is required']);
      }

      const invoice = await invoiceService.updateInvoice(invoiceId, tenantOf(req), updateData);
      
      return ResponseUtil.success(res, invoice, 'Invoice updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return ResponseUtil.notFound(res, 'Invoice not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('cannot be updated') ||
        error.message.includes('must be') ||
        error.message.includes('does not match')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to update invoice', 500, [errorMessage]);
    }
  },

  /**
   * Record a payment for an invoice
   */
  recordPayment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { invoiceId } = req.params;
      const { amount } = req.body;

      if (!invoiceId) {
        return ResponseUtil.validationError(res, ['Invoice ID is required']);
      }

      if (!amount || amount <= 0) {
        return ResponseUtil.validationError(res, ['Payment amount must be greater than zero']);
      }

      const invoice = await invoiceService.recordPayment(invoiceId, tenantOf(req), amount);
      
      return ResponseUtil.success(res, invoice, 'Payment recorded successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return ResponseUtil.notFound(res, 'Invoice not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('cannot record payment') ||
        error.message.includes('already paid') ||
        error.message.includes('must be greater')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to record payment', 500, [errorMessage]);
    }
  },

  /**
   * Cancel an invoice
   */
  cancelInvoice: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { invoiceId } = req.params;
      const { reason } = req.body;

      if (!invoiceId) {
        return ResponseUtil.validationError(res, ['Invoice ID is required']);
      }

      if (!reason) {
        return ResponseUtil.validationError(res, ['Cancellation reason is required']);
      }

      const invoice = await invoiceService.cancelInvoice(invoiceId, tenantOf(req), reason);
      
      return ResponseUtil.success(res, invoice, 'Invoice cancelled successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return ResponseUtil.notFound(res, 'Invoice not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('cannot be cancelled') ||
        error.message.includes('already cancelled') ||
        error.message.includes('required')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to cancel invoice', 500, [errorMessage]);
    }
  },

  /**
   * Delete an invoice (soft delete)
   */
  deleteInvoice: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { invoiceId } = req.params;

      if (!invoiceId) {
        return ResponseUtil.validationError(res, ['Invoice ID is required']);
      }

      await invoiceService.deleteInvoice(invoiceId, tenantOf(req));
      
      return ResponseUtil.success(res, null, 'Invoice deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return ResponseUtil.notFound(res, 'Invoice not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') ||
        error.message.includes('cannot be deleted')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to delete invoice', 500, [errorMessage]);
    }
  }
};

export default invoiceController;