import { Request, Response } from 'express';
import { AuditLog } from '../models/audit-log.model';

export class AuditController {
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);

      const where: Record<string, unknown> = {};
      const tenantId = (req as any).tenant?.id;
      if (tenantId) where.tenant_id = tenantId;
      if (req.query.action) where.action = req.query.action;
      if (req.query.resource) where.resource = req.query.resource;
      if (req.query.user_id) where.user_id = req.query.user_id;

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        offset: (page - 1) * limit,
        limit
      });

      res.status(200).json({
        status: 'success',
        message: 'Audit logs retrieved',
        data: { logs: rows, total: count, page, limit }
      });
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({ status: 'error', message: 'Failed to retrieve audit logs' });
    }
  }
}
