import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { User, Role, Permission } from '../models';
import { initializeRedisConnection } from '../core/redis';

const RBAC_CACHE_TTL = 300; // 5 minutes

async function getCachedPermissions(userId: string): Promise<Array<{ resource: string; action: string }> | null> {
  try {
    const redis = await initializeRedisConnection();
    const cached = await redis.get(`rbac:${userId}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

async function setCachedPermissions(userId: string, permissions: Array<{ resource: string; action: string }>): Promise<void> {
  try {
    const redis = await initializeRedisConnection();
    await redis.set(`rbac:${userId}`, JSON.stringify(permissions), 'EX', RBAC_CACHE_TTL);
  } catch {
    // Redis unavailable — continue without caching
  }
}

export const authorize = (resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      let permissions = await getCachedPermissions(userId);

      if (!permissions) {
        const user = await User.findByPk(userId, {
          attributes: ['id'],
          include: [{
            model: Role,
            as: 'role',
            include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
          }]
        });

        if (!user) {
          return res.status(401).json({ message: 'User not found or no role assigned' });
        }

        const role = (user as any).role;
        if (!role) {
          return res.status(401).json({ message: 'No role assigned' });
        }

        permissions = ((role.permissions ?? []) as Permission[]).map((p) => ({
          resource: p.resource,
          action: p.action,
        }));

        await setCachedPermissions(userId, permissions);
      }

      const hasPermission = permissions.some(
        (p) => p.resource === resource && p.action === action
      );

      if (!hasPermission) {
        return res.status(403).json({
          message: `Access denied. Required permission: ${resource}.${action}`,
        });
      }

      return next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ message: 'Authorization check failed' });
    }
  };
};

// Alias for the required function name
export const authorizePermission = authorize;
