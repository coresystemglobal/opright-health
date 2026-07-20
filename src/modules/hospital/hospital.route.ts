import express, { Request, Response } from 'express';
import hospitalController from './hospital.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

// A hospital profile belongs to its tenant — every route is tenant-scoped.
const hospitalRouter = express.Router();

hospitalRouter.get('/',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.HOSPITAL_VIEW),
  async (req: Request, res: Response) => {
    await hospitalController.getAllHospitals(req, res);
  }
);

hospitalRouter.get('/:id',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.HOSPITAL_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.getHospitalById(req, res);
  }
);

hospitalRouter.post('/',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.HOSPITAL_CREATE),
  async (req: Request, res: Response) => {
    await hospitalController.createHospital(req, res);
  }
);

hospitalRouter.put('/:id',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.HOSPITAL_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.updateHospital(req, res);
  }
);

hospitalRouter.patch('/:id/status',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.HOSPITAL_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.toggleStatus(req, res);
  }
);

hospitalRouter.delete('/:id',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.HOSPITAL_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.deleteHospital(req, res);
  }
);

export default hospitalRouter;
