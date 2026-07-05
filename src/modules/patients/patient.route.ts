import express, { Request, Response } from 'express';
import patientController from './patient.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, patientValidation, genericValidation } from '@utils/validator';

const patientRouter = express.Router();

patientRouter.get('/me', authentication, async (req: Request, res: Response) => {
  await patientController.getMyProfile(req, res);
});

patientRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_VIEW),
  validateQuery(patientValidation.search),
  async (req: Request, res: Response) => {
    await patientController.getAllPatients(req, res);
  }
);

patientRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await patientController.getPatientById(req, res);
  }
);

patientRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_CREATE),
  validate(patientValidation.create),
  async (req: Request, res: Response) => {
    await patientController.createPatient(req, res);
  }
);

patientRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_UPDATE),
  validateParams(genericValidation.id),
  validate(patientValidation.update),
  async (req: Request, res: Response) => {
    await patientController.updatePatient(req, res);
  }
);

patientRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await patientController.deletePatient(req, res);
  }
);

export default patientRouter;
