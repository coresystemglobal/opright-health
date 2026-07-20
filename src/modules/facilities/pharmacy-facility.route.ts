import express, { Request, Response } from 'express';
import pharmacyFacilityController from './pharmacy-facility.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, pharmacyFacilityValidation, genericValidation } from '@utils/validator';

// Tenant-scoped CRUD for a tenant's own pharmacy facility profile.
const pharmacyFacilityRouter = express.Router();
const auth = [authentication, tenantMiddleware];

pharmacyFacilityRouter.post('/', ...auth,
  checkPermission(PERMISSIONS.FACILITY_MANAGE),
  validate(pharmacyFacilityValidation.create),
  (req: Request, res: Response) => pharmacyFacilityController.create(req, res));

pharmacyFacilityRouter.get('/', ...auth,
  checkPermission(PERMISSIONS.FACILITY_VIEW),
  validateQuery(genericValidation.pagination),
  (req: Request, res: Response) => pharmacyFacilityController.list(req, res));

pharmacyFacilityRouter.get('/:id', ...auth,
  checkPermission(PERMISSIONS.FACILITY_VIEW),
  validateParams(genericValidation.id),
  (req: Request, res: Response) => pharmacyFacilityController.get(req, res));

pharmacyFacilityRouter.put('/:id', ...auth,
  checkPermission(PERMISSIONS.FACILITY_MANAGE),
  validateParams(genericValidation.id),
  validate(pharmacyFacilityValidation.update),
  (req: Request, res: Response) => pharmacyFacilityController.update(req, res));

pharmacyFacilityRouter.delete('/:id', ...auth,
  checkPermission(PERMISSIONS.FACILITY_MANAGE),
  validateParams(genericValidation.id),
  (req: Request, res: Response) => pharmacyFacilityController.remove(req, res));

export default pharmacyFacilityRouter;
