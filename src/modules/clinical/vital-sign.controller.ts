import { Request, Response } from 'express';
import { vitalSignService } from '@modules/clinical/vital-sign.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const vitalSignController = {
  recordVitalSign: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      const recordedBy = (req as any).user?.userId;

      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!recordedBy) return ResponseUtil.unauthorized(res);

      const vital = await vitalSignService.recordVitalSign({
        ...req.body,
        recorded_by: recordedBy,
        tenant_id: tenantId
      });

      return ResponseUtil.success(res, vital, 'Vital signs recorded successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to record vital signs', 500, [msg]);
    }
  },

  getPatientVitalSigns: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { page = '1', limit = '10' } = req.query;

      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };

      const result = await vitalSignService.getPatientVitalSigns(patientId, paginationQuery);
      return ResponseUtil.paginated(res, result.vitals, result.count, result.page, result.limit, 'Vital signs retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid patient')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve vital signs', 500, [msg]);
    }
  },

  getLatestVitalSign: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const vital = await vitalSignService.getLatestVitalSign(patientId);
      if (!vital) return ResponseUtil.notFound(res, 'No vital signs recorded for this patient');
      return ResponseUtil.success(res, vital, 'Latest vital signs retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid patient')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve latest vital signs', 500, [msg]);
    }
  },

  getTrends: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { metrics, startDate, endDate } = req.query as Record<string, string>;

      const metricList = metrics ? metrics.split(',').map(m => m.trim()).filter(Boolean) : undefined;

      let start: Date | undefined;
      let end: Date | undefined;
      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) return ResponseUtil.validationError(res, ['Invalid startDate']);
      }
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) return ResponseUtil.validationError(res, ['Invalid endDate']);
      }
      if (start && end && start > end) {
        return ResponseUtil.validationError(res, ['startDate must be before endDate']);
      }

      const trends = await vitalSignService.getTrends(patientId, { metrics: metricList, startDate: start, endDate: end });
      return ResponseUtil.success(res, trends, 'Vital sign trends retrieved successfully');
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid patient') || error.message.includes('valid metrics'))) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve vital sign trends', 500, [msg]);
    }
  },

  getVitalSignById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const vital = await vitalSignService.getVitalSignById(id);
      return ResponseUtil.success(res, vital, 'Vital sign record retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Vital sign record not found') return ResponseUtil.notFound(res, 'Vital sign record not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve vital sign record', 500, [msg]);
    }
  },

  updateVitalSign: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const vital = await vitalSignService.updateVitalSign(id, req.body);
      return ResponseUtil.success(res, vital, 'Vital sign record updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Vital sign record not found') return ResponseUtil.notFound(res, 'Vital sign record not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update vital sign record', 500, [msg]);
    }
  },

  deleteVitalSign: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await vitalSignService.deleteVitalSign(id);
      return ResponseUtil.success(res, null, 'Vital sign record deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Vital sign record not found') return ResponseUtil.notFound(res, 'Vital sign record not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete vital sign record', 500, [msg]);
    }
  }
};

export default vitalSignController;
