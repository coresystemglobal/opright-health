import { Request, Response } from 'express';
import { reportScheduleService } from '@modules/reports/report-schedule.service';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('required') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const reportScheduleController = {
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const schedule = await reportScheduleService.createSchedule({ ...req.body, created_by: (req as any).user?.userId, tenant_id: tenantId });
      return ResponseUtil.success(res, schedule, 'Report schedule created successfully', 201);
    } catch (e) { return fail(res, e, 'create schedule'); }
  },

  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const r = await reportScheduleService.listSchedules(tenantId, paged(req));
      return ResponseUtil.paginated(res, r.schedules, r.count, r.page, r.limit, 'Report schedules retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve schedules'); }
  },

  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const schedule = await reportScheduleService.getScheduleById(req.params.id, tenantId);
      return ResponseUtil.success(res, schedule, 'Report schedule retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve schedule'); }
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const schedule = await reportScheduleService.updateSchedule(req.params.id, tenantId, req.body);
      return ResponseUtil.success(res, schedule, 'Report schedule updated successfully');
    } catch (e) { return fail(res, e, 'update schedule'); }
  },

  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      await reportScheduleService.deleteSchedule(req.params.id, tenantId);
      return ResponseUtil.success(res, null, 'Report schedule deleted successfully');
    } catch (e) { return fail(res, e, 'delete schedule'); }
  },

  runNow: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const result = await reportScheduleService.runNow(req.params.id, tenantId);
      return ResponseUtil.success(res, result, 'Report schedule executed');
    } catch (e) { return fail(res, e, 'run schedule'); }
  }
};

export default reportScheduleController;
