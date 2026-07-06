import { AuditLog, AuditAction } from '@modules/audit/audit-log.model';

import { Request } from 'express';

interface AuditData {
  tenantId?: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async log(data: AuditData): Promise<void> {
    try {
      await AuditLog.create({
        tenant_id: data.tenantId,
        user_id: data.userId,
        action: data.action,
        resource: data.resource,
        resource_id: data.resourceId,
        old_values: data.oldValues,
        new_values: data.newValues,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        description: data.description
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  static async logFromRequest(req: any, action: AuditAction, resource: string, data?: {
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    description?: string;
  }): Promise<void> {
    await this.log({
      tenantId: req.tenant?.id,
      userId: req.user?.userId,
      action,
      resource,
      resourceId: data?.resourceId,
      oldValues: data?.oldValues,
      newValues: data?.newValues,
      description: data?.description,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent')
    });
  }

  static async getAuditLogs(tenantId?: string, filters?: {
    userId?: string;
    resource?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (tenantId) where.tenant_id = tenantId;
    if (filters?.userId) where.user_id = filters.userId;
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: ['user', 'tenant'],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return { logs: rows, count, page, limit };
  }
}

export const auditService = new AuditService();