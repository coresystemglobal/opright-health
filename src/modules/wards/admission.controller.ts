import { Request, Response } from 'express';
import { admissionService } from '@modules/wards/admission.service';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

const admissionController = {
  admitPatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      const createdBy = (req as any).user?.userId;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!createdBy) return ResponseUtil.unauthorized(res);

      const admission = await admissionService.admitPatient({ ...req.body, created_by: createdBy, tenant_id: tenantId });
      return ResponseUtil.success(res, admission, 'Patient admitted successfully', 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Bed not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('already has an active') || msg.includes('not available') || msg.includes('does not belong') ||
          msg.includes('required') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to admit patient', 500, [msg]);
    }
  },

  transferPatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const admission = await admissionService.transferPatient(req.params.id, req.body.bed_id);
      return ResponseUtil.success(res, admission, 'Patient transferred successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Admission not found' || msg === 'Target bed not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('active admission') || msg.includes('already in') || msg.includes('not available') ||
          msg.includes('does not belong') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to transfer patient', 500, [msg]);
    }
  },

  dischargePatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const admission = await admissionService.dischargePatient(req.params.id, req.body?.notes);
      return ResponseUtil.success(res, admission, 'Patient discharged successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Admission not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('not active') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to discharge patient', 500, [msg]);
    }
  },

  getActiveAdmissions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { ward_id } = req.query as Record<string, string>;
      const result = await admissionService.getActiveAdmissions(tenantId, paged(req), ward_id);
      return ResponseUtil.paginated(res, result.admissions, result.count, result.page, result.limit, 'Active admissions retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve admissions', 500, [msg]);
    }
  },

  getPatientAdmissions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await admissionService.getPatientAdmissions(req.params.patientId, paged(req));
      return ResponseUtil.paginated(res, result.admissions, result.count, result.page, result.limit, 'Patient admissions retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to retrieve patient admissions', 500, [msg]);
    }
  },

  getAdmissionById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const admission = await admissionService.getAdmissionById(req.params.id);
      return ResponseUtil.success(res, admission, 'Admission retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Admission not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to retrieve admission', 500, [msg]);
    }
  }
};

export default admissionController;
