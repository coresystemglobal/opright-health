import { Request, Response } from 'express';
import { laboratoryFacilityService } from './laboratory-facility.service';
import { ResponseUtil } from '@utils/response.util';

const tenantOf = (req: Request): string =>
  (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);

const fail = (res: Response, e: unknown, verb: string) => {
  if (e instanceof Error && e.name === 'SequelizeUniqueConstraintError') {
    return ResponseUtil.validationError(res, ['License number already exists']);
  }
  const msg = e instanceof Error ? e.message : 'Unknown error';
  return ResponseUtil.error(res, `Failed to ${verb} laboratory`, 500, [msg]);
};

const laboratoryFacilityController = {
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const lab = await laboratoryFacilityService.create(req.body, tenantOf(req));
      return ResponseUtil.success(res, lab, 'Laboratory created successfully', 201);
    } catch (e) { return fail(res, e, 'create'); }
  },

  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '10');
      const { items, total } = await laboratoryFacilityService.list(tenantOf(req), { page, limit });
      return ResponseUtil.success(res, {
        laboratories: items,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }, 'Laboratories retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve'); }
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const lab = await laboratoryFacilityService.getById(req.params.id, tenantOf(req));
      if (!lab) return ResponseUtil.notFound(res, 'Laboratory not found');
      return ResponseUtil.success(res, lab, 'Laboratory retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve'); }
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      const lab = await laboratoryFacilityService.update(req.params.id, req.body, tenantOf(req));
      if (!lab) return ResponseUtil.notFound(res, 'Laboratory not found');
      return ResponseUtil.success(res, lab, 'Laboratory updated successfully');
    } catch (e) { return fail(res, e, 'update'); }
  },

  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      const ok = await laboratoryFacilityService.remove(req.params.id, tenantOf(req));
      if (!ok) return ResponseUtil.notFound(res, 'Laboratory not found');
      return ResponseUtil.success(res, null, 'Laboratory deleted successfully');
    } catch (e) { return fail(res, e, 'delete'); }
  }
};

export default laboratoryFacilityController;
