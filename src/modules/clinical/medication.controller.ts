import { Request, Response } from 'express';
import { medicationService } from '@modules/clinical/medication.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const medicationController = {
  createMedication: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      const recordedBy = (req as any).user?.userId;

      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!recordedBy) return ResponseUtil.unauthorized(res);

      const medication = await medicationService.createMedication({
        ...req.body,
        recorded_by: recordedBy,
        tenant_id: tenantId
      });

      return ResponseUtil.success(res, medication, 'Medication created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create medication', 500, [msg]);
    }
  },

  getPatientMedications: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { page = '1', limit = '10', is_active } = req.query;

      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };
      const isActive = is_active !== undefined ? is_active === 'true' : undefined;

      const result = await medicationService.getPatientMedications(patientId, paginationQuery, isActive);
      return ResponseUtil.paginated(res, result.medications, result.count, result.page, result.limit, 'Medications retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid patient')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve medications', 500, [msg]);
    }
  },

  getMedicationById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const medication = await medicationService.getMedicationById(id);
      return ResponseUtil.success(res, medication, 'Medication retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Medication not found') return ResponseUtil.notFound(res, 'Medication not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve medication', 500, [msg]);
    }
  },

  updateMedication: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const medication = await medicationService.updateMedication(id, req.body);
      return ResponseUtil.success(res, medication, 'Medication updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Medication not found') return ResponseUtil.notFound(res, 'Medication not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update medication', 500, [msg]);
    }
  },

  deleteMedication: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await medicationService.deleteMedication(id);
      return ResponseUtil.success(res, null, 'Medication deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Medication not found') return ResponseUtil.notFound(res, 'Medication not found');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete medication', 500, [msg]);
    }
  },

  getActiveMedications: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const medications = await medicationService.getActiveMedications(patientId);
      return ResponseUtil.success(res, medications, 'Active medications retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid patient')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve active medications', 500, [msg]);
    }
  }
};

export default medicationController;
