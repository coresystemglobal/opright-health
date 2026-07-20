import express, { Request, Response } from 'express';
import laboratoryFacilityController from './laboratory-facility.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, laboratoryFacilityValidation, genericValidation } from '@utils/validator';

// Tenant-scoped CRUD for a tenant's own laboratory facility profile.
const laboratoryFacilityRouter = express.Router();
const auth = [authentication, tenantMiddleware];

laboratoryFacilityRouter.post('/', ...auth,
  checkPermission(PERMISSIONS.FACILITY_MANAGE),
  validate(laboratoryFacilityValidation.create),
  (req: Request, res: Response) => laboratoryFacilityController.create(req, res));

laboratoryFacilityRouter.get('/', ...auth,
  checkPermission(PERMISSIONS.FACILITY_VIEW),
  validateQuery(genericValidation.pagination),
  (req: Request, res: Response) => laboratoryFacilityController.list(req, res));

laboratoryFacilityRouter.get('/:id', ...auth,
  checkPermission(PERMISSIONS.FACILITY_VIEW),
  validateParams(genericValidation.id),
  (req: Request, res: Response) => laboratoryFacilityController.get(req, res));

laboratoryFacilityRouter.put('/:id', ...auth,
  checkPermission(PERMISSIONS.FACILITY_MANAGE),
  validateParams(genericValidation.id),
  validate(laboratoryFacilityValidation.update),
  (req: Request, res: Response) => laboratoryFacilityController.update(req, res));

laboratoryFacilityRouter.delete('/:id', ...auth,
  checkPermission(PERMISSIONS.FACILITY_MANAGE),
  validateParams(genericValidation.id),
  (req: Request, res: Response) => laboratoryFacilityController.remove(req, res));

export default laboratoryFacilityRouter;
