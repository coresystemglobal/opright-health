import express, { Request, Response } from 'express';
import admissionController from './admission.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, admissionValidation, genericValidation } from '@utils/validator';

const admissionRouter = express.Router();

// Admit a patient to a bed
admissionRouter.post('/', authentication, tenantMiddleware, validate(admissionValidation.admit),
  (req: Request, res: Response) => admissionController.admitPatient(req, res));

// Active admissions (optionally filtered by ward)
admissionRouter.get('/', authentication, tenantMiddleware, validateQuery(admissionValidation.list),
  (req: Request, res: Response) => admissionController.getActiveAdmissions(req, res));

admissionRouter.get('/patient/:patientId', authentication, tenantMiddleware,
  (req: Request, res: Response) => admissionController.getPatientAdmissions(req, res));

admissionRouter.get('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id),
  (req: Request, res: Response) => admissionController.getAdmissionById(req, res));

// Transfer to another bed
admissionRouter.patch('/:id/transfer', authentication, tenantMiddleware, validateParams(genericValidation.id), validate(admissionValidation.transfer),
  (req: Request, res: Response) => admissionController.transferPatient(req, res));

// Discharge
admissionRouter.patch('/:id/discharge', authentication, tenantMiddleware, validateParams(genericValidation.id), validate(admissionValidation.discharge),
  (req: Request, res: Response) => admissionController.dischargePatient(req, res));

export default admissionRouter;
