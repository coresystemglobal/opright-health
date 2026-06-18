import { Request, Response } from 'express';
import { visitorLogService } from './visitor-log.service';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const visitorLogController = {
  checkIn: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const visitor = await visitorLogService.checkIn({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, visitor, 'Visitor checked in successfully', 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to check in visitor', 500, [msg]);
    }
  },

  checkOut: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const visitor = await visitorLogService.checkOut(req.params.id, tenantId);
      return ResponseUtil.success(res, visitor, 'Visitor checked out successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Visitor record not found') {
        return ResponseUtil.notFound(res, 'Visitor record not found');
      }
      if (error instanceof Error && error.message === 'Visitor already checked out') {
        return ResponseUtil.error(res, 'Visitor already checked out', 409);
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to check out visitor', 500, [msg]);
    }
  },

  lookupByPhone: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const { phone } = req.query;
      if (!phone) return ResponseUtil.validationError(res, ['Phone number is required']);

      const visitors = await visitorLogService.lookupByPhone(phone as string, tenantId);
      return ResponseUtil.success(res, visitors, 'Visitor lookup successful');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to lookup visitor', 500, [msg]);
    }
  },

  getAll: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const { page = '1', limit = '20', status, q } = req.query;
      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };
      const result = await visitorLogService.getAll(paginationQuery, tenantId, status as string, q as string);

      return ResponseUtil.paginated(res, result.visitors, result.count, result.page, result.limit, 'Visitor logs retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve visitor logs', 500, [msg]);
    }
  },

  getActive: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const visitors = await visitorLogService.getActiveVisitors(tenantId);
      return ResponseUtil.success(res, visitors, 'Active visitors retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve active visitors', 500, [msg]);
    }
  },

  getById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const visitor = await visitorLogService.getById(req.params.id, tenantId);
      return ResponseUtil.success(res, visitor, 'Visitor record retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Visitor record not found') {
        return ResponseUtil.notFound(res, 'Visitor record not found');
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve visitor record', 500, [msg]);
    }
  }
};

export default visitorLogController;
