import { Request, Response } from 'express';
import { planService } from '@modules/billing/plan.service';
import { ResponseUtil } from '@utils/response.util';

const fail = (res: Response, e: unknown, verb: string) => {
  if (e instanceof Error && (e.message.includes('already exists') || e.message.includes('required') || e.message.includes('Invalid'))) {
    return ResponseUtil.validationError(res, [e.message]);
  }
  if (e instanceof Error && e.message === 'Plan not found') return ResponseUtil.notFound(res, 'Plan not found');
  const msg = e instanceof Error ? e.message : 'Unknown error';
  return ResponseUtil.error(res, `Failed to ${verb} plan`, 500, [msg]);
};

const planController = {
  list: async (_req: Request, res: Response): Promise<Response> => {
    try {
      return ResponseUtil.success(res, await planService.list(true), 'Plans retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve'); }
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      return ResponseUtil.success(res, await planService.getById(req.params.id), 'Plan retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve'); }
  },

  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      return ResponseUtil.success(res, await planService.create(req.body), 'Plan created successfully', 201);
    } catch (e) { return fail(res, e, 'create'); }
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      return ResponseUtil.success(res, await planService.update(req.params.id, req.body), 'Plan updated successfully');
    } catch (e) { return fail(res, e, 'update'); }
  },

  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      await planService.remove(req.params.id);
      return ResponseUtil.success(res, null, 'Plan deleted successfully');
    } catch (e) { return fail(res, e, 'delete'); }
  }
};

export default planController;
