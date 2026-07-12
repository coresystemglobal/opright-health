import { Request, Response } from 'express';
import { prescriptionService } from '@modules/clinical/prescription.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';
import { PrescriptionStatus } from '@modules/clinical/prescription.model';

const prescriptionController = {
  createPrescription: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      const createdBy = (req as any).user?.userId;

      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!createdBy) return ResponseUtil.unauthorized(res);

      const prescription = await prescriptionService.createPrescription({
        ...req.body,
        created_by: createdBy,
        tenant_id: tenantId
      });

      return ResponseUtil.success(res, prescription, 'Prescription created successfully', 201);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('required') || error.message.includes('at least one'))) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create prescription', 500, [msg]);
    }
  },

  getPatientPrescriptions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { page = '1', limit = '10', status } = req.query;
      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };

      const result = await prescriptionService.getPatientPrescriptions(
        patientId,
        paginationQuery,
        status as PrescriptionStatus | undefined
      );

      return ResponseUtil.paginated(res, result.prescriptions, result.count, result.page, result.limit, 'Prescriptions retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid patient')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve prescriptions', 500, [msg]);
    }
  },

  getPrescriptionById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const prescription = await prescriptionService.getPrescriptionById(id);
      return ResponseUtil.success(res, prescription, 'Prescription retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Prescription not found') return ResponseUtil.notFound(res, 'Prescription not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve prescription', 500, [msg]);
    }
  },

  sendToPharmacy: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { pharmacy_name } = req.body;
      const prescription = await prescriptionService.sendToPharmacy(id, pharmacy_name);
      return ResponseUtil.success(res, prescription, 'Prescription sent to pharmacy');
    } catch (error) {
      if (error instanceof Error && error.message === 'Prescription not found') return ResponseUtil.notFound(res, 'Prescription not found');
      if (error instanceof Error && (error.message.includes('Cannot send') || error.message.includes('required'))) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to send prescription to pharmacy', 500, [msg]);
    }
  },

  dispense: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { item_ids } = req.body;
      const dispensedBy = (req as any).user?.userId;
      if (!dispensedBy) return ResponseUtil.unauthorized(res);

      const prescription = await prescriptionService.dispense(id, dispensedBy, item_ids);
      return ResponseUtil.success(res, prescription, 'Prescription dispensed');
    } catch (error) {
      if (error instanceof Error && error.message === 'Prescription not found') return ResponseUtil.notFound(res, 'Prescription not found');
      if (error instanceof Error && error.message.includes('Insufficient stock')) return ResponseUtil.conflict(res, error.message);
      if (error instanceof Error && (error.message.includes('cannot be dispensed') || error.message.includes('already') || error.message.includes('no items'))) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to dispense prescription', 500, [msg]);
    }
  },

  cancel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const prescription = await prescriptionService.cancel(id, reason);
      return ResponseUtil.success(res, prescription, 'Prescription cancelled');
    } catch (error) {
      if (error instanceof Error && error.message === 'Prescription not found') return ResponseUtil.notFound(res, 'Prescription not found');
      if (error instanceof Error && (error.message.includes('cannot be cancelled') || error.message.includes('already'))) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to cancel prescription', 500, [msg]);
    }
  }
};

export default prescriptionController;
