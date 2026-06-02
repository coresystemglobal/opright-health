import { Request, Response } from 'express';
import { patientService } from '@modules/patients/patient.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const patientController = {
  getAllPatients: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page = '1', limit = '10', q } = req.query;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return ResponseUtil.error(res, 'Tenant ID is required', 400);
      }

      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };
      const result = await patientService.getAllPatients(paginationQuery, tenantId, q as string);

      return ResponseUtil.paginated(res, result.patients, result.count, result.page, result.limit, 'Patients retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve patients', 500, [msg]);
    }
  },

  getPatientById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const patient = await patientService.getPatientById(id);
      return ResponseUtil.success(res, patient, 'Patient retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Patient not found') {
        return ResponseUtil.notFound(res, 'Patient not found');
      }
      if (error instanceof Error && error.message === 'Invalid patient ID format') {
        return ResponseUtil.validationError(res, ['Invalid patient ID format']);
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve patient', 500, [msg]);
    }
  },

  getMyProfile: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!userId) return ResponseUtil.unauthorized(res);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const patient = await patientService.getPatientByUserId(userId, tenantId);
      return ResponseUtil.success(res, patient, 'Patient profile retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseUtil.notFound(res, 'Patient profile not found');
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve patient profile', 500, [msg]);
    }
  },

  createPatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return ResponseUtil.error(res, 'Tenant ID is required', 400);
      }

      const patient = await patientService.createPatient({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, patient, 'Patient created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtil.conflict(res, error.message);
      }
      if (error instanceof Error && error.message.includes('required')) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create patient', 500, [msg]);
    }
  },

  updatePatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const patient = await patientService.updatePatient(id, req.body);
      return ResponseUtil.success(res, patient, 'Patient updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Patient not found') {
        return ResponseUtil.notFound(res, 'Patient not found');
      }
      if (error instanceof Error && error.message === 'Invalid patient ID format') {
        return ResponseUtil.validationError(res, ['Invalid patient ID format']);
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update patient', 500, [msg]);
    }
  },

  deletePatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await patientService.deletePatient(id);
      return ResponseUtil.success(res, null, 'Patient deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Patient not found') {
        return ResponseUtil.notFound(res, 'Patient not found');
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete patient', 500, [msg]);
    }
  }
};

export default patientController;
