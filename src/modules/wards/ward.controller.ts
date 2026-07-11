import { Request, Response } from 'express';
import { wardService } from '@modules/wards/ward.service';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

const wardController = {
  createWard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const ward = await wardService.createWard({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, ward, 'Ward created successfully', 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
      if (msg.includes('required') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to create ward', 500, [msg]);
    }
  },

  getWards: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { hospital_id, department_id, ward_type, is_active } = req.query as Record<string, string>;
      const result = await wardService.getWards(tenantId, paged(req), {
        hospital_id, department_id, ward_type: ward_type as any,
        is_active: is_active === undefined ? undefined : is_active === 'true'
      });
      return ResponseUtil.paginated(res, result.wards, result.count, result.page, result.limit, 'Wards retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve wards', 500, [msg]);
    }
  },

  getWardById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await wardService.getWardById(req.params.id);
      return ResponseUtil.success(res, data, 'Ward retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Ward not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to retrieve ward', 500, [msg]);
    }
  },

  getWardAvailability: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await wardService.getWardAvailability(req.params.id);
      return ResponseUtil.success(res, data, 'Ward availability retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Ward not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to retrieve ward availability', 500, [msg]);
    }
  },

  updateWard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const ward = await wardService.updateWard(req.params.id, req.body);
      return ResponseUtil.success(res, ward, 'Ward updated successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Ward not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to update ward', 500, [msg]);
    }
  },

  deleteWard: async (req: Request, res: Response): Promise<Response> => {
    try {
      await wardService.deleteWard(req.params.id);
      return ResponseUtil.success(res, null, 'Ward deleted successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Ward not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('Cannot delete')) return ResponseUtil.conflict(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to delete ward', 500, [msg]);
    }
  }
};

export default wardController;
