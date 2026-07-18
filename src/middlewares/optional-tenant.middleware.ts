import { Response, NextFunction } from 'express';
import { Tenant } from '@modules/tenancy/tenant.model';
import { getPlatformTenant } from '@config/platform.config';
import type { TenantRequest } from '@middlewares/tenant.middleware';

/**
 * Like tenantMiddleware, but instead of rejecting requests with no
 * `x-tenant-id`, it falls back to the direct-to-consumer platform tenant. This
 * lets a self-service user (who belongs to no hospital) use tenant-scoped
 * features — telemedicine, etc. — while hospital callers keep passing their own
 * `x-tenant-id` and are scoped to their tenant as usual.
 */
export const optionalTenantMiddleware = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string);

    if (tenantId) {
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant || tenant.status !== 'active') {
        return res.status(404).json({ message: 'Tenant not found or inactive' });
      }
      req.tenant = tenant;
      return next();
    }

    // No explicit tenant → direct-to-consumer platform tenant.
    const platform = await getPlatformTenant();
    if (!platform || platform.status !== 'active') {
      return res.status(503).json({ message: 'Platform tenant is not available; contact support' });
    }
    req.tenant = platform;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Tenant resolution failed' });
  }
};
