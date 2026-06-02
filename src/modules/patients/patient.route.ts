import express, { Request, Response } from 'express';
import patientController from './patient.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, patientValidation, genericValidation } from '@utils/validator';

const patientRouter = express.Router();

// GET /api/patients/me — authenticated patient's own profile
patientRouter.get('/me', authentication, async (req: Request, res: Response) => {
  await patientController.getMyProfile(req, res);
});

// GET /api/patients — list all patients (admin/doctor/staff only)
patientRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_VIEW),
  validateQuery(patientValidation.search),
  async (req: Request, res: Response) => {
    await patientController.getAllPatients(req, res);
  }
);

// GET /api/patients/:id — get patient by ID
patientRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await patientController.getPatientById(req, res);
  }
);

// POST /api/patients — create new patient record
patientRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_CREATE),
  validate(patientValidation.create),
  async (req: Request, res: Response) => {
    await patientController.createPatient(req, res);
  }
);

// PUT /api/patients/:id — update patient
patientRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_UPDATE),
  validateParams(genericValidation.id),
  validate(patientValidation.update),
  async (req: Request, res: Response) => {
    await patientController.updatePatient(req, res);
  }
);

// DELETE /api/patients/:id — soft delete patient (admin only)
patientRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await patientController.deletePatient(req, res);
  }
);

export default patientRouter;
