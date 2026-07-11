import { Request, Response } from 'express';
import { bedService } from '@modules/wards/bed.service';
import { BedStatus } from '@modules/wards/bed.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

const bedController = {
  createBed: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const bed = await bedService.createBed({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, bed, 'Bed created successfully', 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Ward not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
      if (msg.includes('required') || msg.includes('Invalid') || msg.includes('does not belong')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to create bed', 500, [msg]);
    }
  },

  getBedsByWard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { status } = req.query as Record<string, string>;
      const result = await bedService.getBedsByWard(req.params.wardId, paged(req), status as BedStatus | undefined);
      return ResponseUtil.paginated(res, result.beds, result.count, result.page, result.limit, 'Beds retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to retrieve beds', 500, [msg]);
    }
  },

  getBedById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const bed = await bedService.getBedById(req.params.id);
      return ResponseUtil.success(res, bed, 'Bed retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Bed not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to retrieve bed', 500, [msg]);
    }
  },

  updateBed: async (req: Request, res: Response): Promise<Response> => {
    try {
      const bed = await bedService.updateBed(req.params.id, req.body);
      return ResponseUtil.success(res, bed, 'Bed updated successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Bed not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to update bed', 500, [msg]);
    }
  },

  changeBedStatus: async (req: Request, res: Response): Promise<Response> => {
    try {
      const bed = await bedService.changeBedStatus(req.params.id, req.body.status);
      return ResponseUtil.success(res, bed, 'Bed status updated successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Bed not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('Cannot set') || msg.includes('occupied') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to change bed status', 500, [msg]);
    }
  },

  deleteBed: async (req: Request, res: Response): Promise<Response> => {
    try {
      await bedService.deleteBed(req.params.id);
      return ResponseUtil.success(res, null, 'Bed deleted successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Bed not found') return ResponseUtil.notFound(res, msg);
      if (msg.includes('occupied')) return ResponseUtil.conflict(res, msg);
      if (msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
      return ResponseUtil.error(res, 'Failed to delete bed', 500, [msg]);
    }
  },

  getAvailabilityBoard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { hospital_id } = req.query as Record<string, string>;
      const board = await bedService.getAvailabilityBoard(tenantId, hospital_id);
      return ResponseUtil.success(res, board, 'Availability board retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve availability board', 500, [msg]);
    }
  }
};

export default bedController;
