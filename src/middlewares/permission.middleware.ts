import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { ROLE_PERMISSIONS } from '../config/rbac.config';

export const checkPermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No user found'
      });
      return;
    }

    const userRole = req.user.role;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

    if (!rolePermissions.includes(requiredPermission)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied - insufficient permission'
      });
      return;
    }

    next();
  };
};
