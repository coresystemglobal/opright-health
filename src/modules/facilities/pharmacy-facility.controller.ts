import { Request, Response } from 'express';
import { pharmacyFacilityService } from './pharmacy-facility.service';
import { ResponseUtil } from '@utils/response.util';

const tenantOf = (req: Request): string =>
  (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);

const fail = (res: Response, e: unknown, verb: string) => {
  if (e instanceof Error && e.name === 'SequelizeUniqueConstraintError') {
    return ResponseUtil.validationError(res, ['License number already exists']);
  }
  const msg = e instanceof Error ? e.message : 'Unknown error';
  return ResponseUtil.error(res, `Failed to ${verb} pharmacy`, 500, [msg]);
};

const pharmacyFacilityController = {
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const pharmacy = await pharmacyFacilityService.create(req.body, tenantOf(req));
      return ResponseUtil.success(res, pharmacy, 'Pharmacy created successfully', 201);
    } catch (e) { return fail(res, e, 'create'); }
  },

  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '10');
      const { items, total } = await pharmacyFacilityService.list(tenantOf(req), { page, limit });
      return ResponseUtil.success(res, {
        pharmacies: items,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }, 'Pharmacies retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve'); }
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const pharmacy = await pharmacyFacilityService.getById(req.params.id, tenantOf(req));
      if (!pharmacy) return ResponseUtil.notFound(res, 'Pharmacy not found');
      return ResponseUtil.success(res, pharmacy, 'Pharmacy retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve'); }
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      const pharmacy = await pharmacyFacilityService.update(req.params.id, req.body, tenantOf(req));
      if (!pharmacy) return ResponseUtil.notFound(res, 'Pharmacy not found');
      return ResponseUtil.success(res, pharmacy, 'Pharmacy updated successfully');
    } catch (e) { return fail(res, e, 'update'); }
  },

  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      const ok = await pharmacyFacilityService.remove(req.params.id, tenantOf(req));
      if (!ok) return ResponseUtil.notFound(res, 'Pharmacy not found');
      return ResponseUtil.success(res, null, 'Pharmacy deleted successfully');
    } catch (e) { return fail(res, e, 'delete'); }
  }
};

export default pharmacyFacilityController;
