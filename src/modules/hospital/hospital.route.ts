import express, { Request, Response } from 'express';
import hospitalController from './hospital.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const hospitalRouter = express.Router();

// GET /api/hospitals — list all hospitals
hospitalRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.HOSPITAL_VIEW),
  async (req: Request, res: Response) => {
    await hospitalController.getAllHospitals(req, res);
  }
);

// GET /api/hospitals/:id — get hospital by ID
hospitalRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.HOSPITAL_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.getHospitalById(req, res);
  }
);

// POST /api/hospitals — create hospital (super_admin only)
hospitalRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.HOSPITAL_CREATE),
  async (req: Request, res: Response) => {
    await hospitalController.createHospital(req, res);
  }
);

// PUT /api/hospitals/:id — update hospital
hospitalRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.HOSPITAL_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.updateHospital(req, res);
  }
);

// PATCH /api/hospitals/:id/status — toggle active/inactive
hospitalRouter.patch('/:id/status',
  authentication,
  checkPermission(PERMISSIONS.HOSPITAL_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.toggleStatus(req, res);
  }
);

// DELETE /api/hospitals/:id — soft delete (super_admin only)
hospitalRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.HOSPITAL_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await hospitalController.deleteHospital(req, res);
  }
);

export default hospitalRouter;
