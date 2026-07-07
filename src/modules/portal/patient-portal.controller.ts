import { Request, Response } from 'express';
import { patientPortalService } from '@modules/portal/patient-portal.service';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

function ctx(req: Request): { userId?: string; tenantId?: string } {
  return {
    userId: (req as any).user?.userId,
    tenantId: (req as any).tenant?.id || (req.headers['x-tenant-id'] as string)
  };
}

function handleError(res: Response, error: unknown, action: string): Response {
  if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
    return ResponseUtil.notFound(res, 'Patient profile not found for this account');
  }
  const msg = error instanceof Error ? error.message : 'Unknown error';
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const paged = (req: Request): PaginationQuery => ({
  page: (req.query.page as string) || '1',
  limit: (req.query.limit as string) || '10'
});

const patientPortalController = {
  getDashboard: async (req: Request, res: Response): Promise<Response> => {
    const { userId, tenantId } = ctx(req);
    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    try {
      const data = await patientPortalService.getDashboard(userId, tenantId);
      return ResponseUtil.success(res, data, 'Portal dashboard retrieved successfully');
    } catch (error) {
      return handleError(res, error, 'retrieve dashboard');
    }
  },

  getProfile: async (req: Request, res: Response): Promise<Response> => {
    const { userId, tenantId } = ctx(req);
    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    try {
      const patient = await patientPortalService.getProfile(userId, tenantId);
      return ResponseUtil.success(res, patient, 'Profile retrieved successfully');
    } catch (error) {
      return handleError(res, error, 'retrieve profile');
    }
  },

  getAppointments: async (req: Request, res: Response): Promise<Response> => {
    const { userId, tenantId } = ctx(req);
    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    try {
      const result: any = await patientPortalService.getAppointments(userId, tenantId, paged(req), req.query.status as string);
      return ResponseUtil.paginated(res, result.appointments, result.count, result.page, result.limit, 'Appointments retrieved successfully');
    } catch (error) {
      return handleError(res, error, 'retrieve appointments');
    }
  },

  getPrescriptions: async (req: Request, res: Response): Promise<Response> => {
    const { userId, tenantId } = ctx(req);
    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    try {
      const result: any = await patientPortalService.getPrescriptions(userId, tenantId, paged(req), req.query.status);
      return ResponseUtil.paginated(res, result.prescriptions, result.count, result.page, result.limit, 'Prescriptions retrieved successfully');
    } catch (error) {
      return handleError(res, error, 'retrieve prescriptions');
    }
  },

  getInvoices: async (req: Request, res: Response): Promise<Response> => {
    const { userId, tenantId } = ctx(req);
    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    try {
      const result: any = await patientPortalService.getInvoices(userId, tenantId, paged(req), req.query.status as string);
      return ResponseUtil.paginated(res, result.invoices, result.count, result.page, result.limit, 'Invoices retrieved successfully');
    } catch (error) {
      return handleError(res, error, 'retrieve invoices');
    }
  },

  getLabResults: async (req: Request, res: Response): Promise<Response> => {
    const { userId, tenantId } = ctx(req);
    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    try {
      const result: any = await patientPortalService.getLabResults(userId, tenantId, paged(req));
      return ResponseUtil.paginated(res, result.orders, result.count, result.page, result.limit, 'Lab results retrieved successfully');
    } catch (error) {
      return handleError(res, error, 'retrieve lab results');
    }
  }
};

export default patientPortalController;
