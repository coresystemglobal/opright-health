import express from 'express';
import { AuditController } from './audit.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { authorizePermission } from '@middlewares/authorization';

const auditRouter = express.Router();

// Get audit logs
auditRouter.get('/', 
  tenantMiddleware,
  authentication,
  authorizePermission('reports', 'view'),
  AuditController.getAuditLogs
);

export default auditRouter;