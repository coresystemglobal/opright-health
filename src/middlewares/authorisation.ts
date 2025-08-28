import { Request, Response, NextFunction } from 'express';

export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
