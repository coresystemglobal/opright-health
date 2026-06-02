import { Request, Response, NextFunction } from 'express';
import { Tenant } from '@modules/tenancy/tenant.model';

export interface TenantRequest extends Request {
  tenant?: Tenant;
  user?: {
    userId: string;
    [key: string]: any;
  };
  file?: any;
}

export const tenantMiddleware = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.query.tenant_id as string;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant || tenant.status !== 'active') {
      return res.status(404).json({ message: 'Tenant not found or inactive' });
    }

    req.tenant = tenant;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Tenant validation failed' });
  }
};