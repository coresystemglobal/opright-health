import express, { Request, Response } from 'express';
import patientController from './patient.controller';
import mpiController from '@modules/mpi/mpi.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkResourceLimit } from '@middlewares/billing.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, patientValidation, mpiValidation, genericValidation } from '@utils/validator';

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

// Plan capacity check: blocks creation when the tenant's patient limit is reached
patientRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_CREATE),
  tenantMiddleware,
  checkResourceLimit('patients_count', 'maxPatients', 'Patient'),
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

// ── MPI: link/unlink a patient to a global Person identity (tenant-scoped) ──
patientRouter.post('/:id/link-person',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.PATIENT_UPDATE),
  validateParams(genericValidation.id),
  validate(mpiValidation.linkPerson),
  (req: Request, res: Response) => mpiController.linkPerson(req, res)
);

patientRouter.delete('/:id/link-person',
  authentication,
  tenantMiddleware,
  checkPermission(PERMISSIONS.PATIENT_UPDATE),
  validateParams(genericValidation.id),
  (req: Request, res: Response) => mpiController.unlinkPerson(req, res)
);

export default patientRouter;
