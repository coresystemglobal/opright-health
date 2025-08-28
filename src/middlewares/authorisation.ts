import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/common.types';

export const checkRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log("USER", req.user)
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No user found in request'
      });
      return;
    }
    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied - insufficient permission'
      });
      return;
    }
    next();
  };
};
