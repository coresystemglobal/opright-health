import { Response } from 'express';
import { AuditService } from '../services/audit.service';
import { ResponseUtil } from '../utils/response.util';
import { TenantRequest } from '../middlewares/tenant.middleware';
import { AuditAction } from '../models/audit-log.model';

export class AuditController {
  static async getAuditLogs(req: TenantRequest, res: Response) {
    try {
      const { userId, resource, action, startDate, endDate, page, limit } = req.query;
      
      const result = await AuditService.getAuditLogs(req.tenant?.id, {
        userId: userId as string,
        resource: resource as string,
        action: action as AuditAction,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      return ResponseUtil.paginated(
        res,
        result.logs,
        result.count,
        result.page,
        result.limit,
        'Audit logs retrieved successfully'
      );
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}