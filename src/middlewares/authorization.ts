import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { User, Role, Permission } from '../models';

export const authorize = (resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get user and role with permissions
      const user = await User.findByPk(userId);
      if (!user || !user.role_id) {
        return res.status(401).json({ message: 'User not found or no role assigned' });
      }

      const role = await Role.findByPk(user.role_id, {
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      });

      if (!role) {
        return res.status(401).json({ message: 'Role not found' });
      }

      // Check if user has required permission
      const hasPermission = role.permissions?.some((permission: any) => 
        permission.resource === resource && permission.action === action
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Access denied. Required permission: ${resource}.${action}` 
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

