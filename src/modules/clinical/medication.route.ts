import express, { Request, Response } from 'express';
import medicationController from './medication.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, validateQuery, medicationValidation, genericValidation } from '@utils/validator';

const medicationRouter = express.Router();

// POST /api/medications — prescribe medication (doctor/staff)
medicationRouter.post('/',
  authentication,
  validate(medicationValidation.create),
  async (req: Request, res: Response) => {
    await medicationController.createMedication(req, res);
  }
);

// GET /api/medications/patient/:patientId/active — active medications only
medicationRouter.get('/patient/:patientId/active',
  authentication,
  async (req: Request, res: Response) => {
    await medicationController.getActiveMedications(req, res);
  }
);

// GET /api/medications/patient/:patientId — all medications for a patient
medicationRouter.get('/patient/:patientId',
  authentication,
  validateQuery(medicationValidation.search),
  async (req: Request, res: Response) => {
    await medicationController.getPatientMedications(req, res);
  }
);

// GET /api/medications/:id — get single medication
medicationRouter.get('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await medicationController.getMedicationById(req, res);
  }
);

// PUT /api/medications/:id — update medication
medicationRouter.put('/:id',
  authentication,
  validateParams(genericValidation.id),
  validate(medicationValidation.update),
  async (req: Request, res: Response) => {
    await medicationController.updateMedication(req, res);
  }
);

// DELETE /api/medications/:id — soft delete
medicationRouter.delete('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await medicationController.deleteMedication(req, res);
  }
);

export default medicationRouter;
