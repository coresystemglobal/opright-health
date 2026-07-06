import express, { Request, Response } from 'express';
import doctorController from './doctor.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const doctorRouter = express.Router();

doctorRouter.get('/me', authentication, async (req: Request, res: Response) => {
  await doctorController.getMyProfile(req, res);
});

doctorRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_VIEW),
  async (req: Request, res: Response) => {
    await doctorController.getAllDoctors(req, res);
  }
);

doctorRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.getDoctorById(req, res);
  }
);

doctorRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_CREATE),
  async (req: Request, res: Response) => {
    await doctorController.createDoctor(req, res);
  }
);

doctorRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.updateDoctor(req, res);
  }
);

doctorRouter.patch('/:id/availability',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.toggleAvailability(req, res);
  }
);

doctorRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.deleteDoctor(req, res);
  }
);

export default doctorRouter;
