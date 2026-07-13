import { Request, Response } from 'express';
import { telemedicineService } from '@modules/telemedicine/telemedicine.service';
import { TelemedicineStatus } from '@modules/telemedicine/telemedicine-session.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be') || msg.includes('cannot') || msg.includes('Only ')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const telemedicineController = {
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const session = await telemedicineService.createSession({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, session, 'Telemedicine session created successfully', 201);
    } catch (e) { return fail(res, e, 'create telemedicine session'); }
  },
  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { doctor_id, patient_id, status, appointment_id, from, to } = req.query as Record<string, string>;
      const r = await telemedicineService.listSessions(tenantId, paged(req), {
        doctor_id, patient_id, status: status as TelemedicineStatus, appointment_id, from, to
      });
      return ResponseUtil.paginated(res, r.sessions, r.count, r.page, r.limit, 'Telemedicine sessions retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve telemedicine sessions'); }
  },
  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await telemedicineService.getSessionById(req.params.id, tenantId), 'Telemedicine session retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve telemedicine session'); }
  },
  start: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await telemedicineService.startSession(req.params.id, tenantId), 'Telemedicine session started');
    } catch (e) { return fail(res, e, 'start telemedicine session'); }
  },
  end: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { recording_url, notes } = req.body || {};
      return ResponseUtil.success(res, await telemedicineService.endSession(req.params.id, tenantId, { recording_url, notes }), 'Telemedicine session ended');
    } catch (e) { return fail(res, e, 'end telemedicine session'); }
  },
  cancel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await telemedicineService.cancelSession(req.params.id, tenantId, req.body?.reason), 'Telemedicine session cancelled');
    } catch (e) { return fail(res, e, 'cancel telemedicine session'); }
  }
};

export default telemedicineController;
