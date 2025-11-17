import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../models/audit-log.model';

const getResourceFromPath = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  return segments[1] || 'unknown';
};

const getActionFromMethod = (method: string): AuditAction => {
  switch (method.toUpperCase()) {
    case 'POST': return AuditAction.CREATE;
    case 'PUT':
    case 'PATCH': return AuditAction.UPDATE;
    case 'DELETE': return AuditAction.DELETE;
    default: return AuditAction.ACCESS;
  }
};

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode < 400) {
      const resource = getResourceFromPath(req.path);
      const action = getActionFromMethod(req.method);
      
      AuditService.logFromRequest(req, action, resource, {
        resourceId: req.params.id,
        newValues: req.method !== 'GET' ? req.body : undefined,
        description: `${req.method} ${req.path}`
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};