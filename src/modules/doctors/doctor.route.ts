import express, { Request, Response } from 'express';
import doctorController from './doctor.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const doctorRouter = express.Router();

// GET /api/doctors/me — own doctor profile
doctorRouter.get('/me', authentication, async (req: Request, res: Response) => {
  await doctorController.getMyProfile(req, res);
});

// GET /api/doctors — list all doctors (public — anyone can browse)
doctorRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_VIEW),
  async (req: Request, res: Response) => {
    await doctorController.getAllDoctors(req, res);
  }
);

// GET /api/doctors/:id — get doctor by ID
doctorRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.getDoctorById(req, res);
  }
);

// POST /api/doctors — create doctor (admin only)
doctorRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_CREATE),
  async (req: Request, res: Response) => {
    await doctorController.createDoctor(req, res);
  }
);

// PUT /api/doctors/:id — update doctor
doctorRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.updateDoctor(req, res);
  }
);

// PATCH /api/doctors/:id/availability — toggle availability
doctorRouter.patch('/:id/availability',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.toggleAvailability(req, res);
  }
);

// DELETE /api/doctors/:id — soft delete (admin only)
doctorRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.deleteDoctor(req, res);
  }
);

export default doctorRouter;
