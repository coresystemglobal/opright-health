import express, { Request, Response } from 'express';
import medicationController from './medication.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, validateQuery, medicationValidation, genericValidation } from '@utils/validator';

const medicationRouter = express.Router();

medicationRouter.post('/',
  authentication,
  validate(medicationValidation.create),
  async (req: Request, res: Response) => {
    await medicationController.createMedication(req, res);
  }
);

medicationRouter.get('/patient/:patientId/active',
  authentication,
  async (req: Request, res: Response) => {
    await medicationController.getActiveMedications(req, res);
  }
);

medicationRouter.get('/patient/:patientId',
  authentication,
  validateQuery(medicationValidation.search),
  async (req: Request, res: Response) => {
    await medicationController.getPatientMedications(req, res);
  }
);

medicationRouter.get('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await medicationController.getMedicationById(req, res);
  }
);

medicationRouter.put('/:id',
  authentication,
  validateParams(genericValidation.id),
  validate(medicationValidation.update),
  async (req: Request, res: Response) => {
    await medicationController.updateMedication(req, res);
  }
);

medicationRouter.delete('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await medicationController.deleteMedication(req, res);
  }
);

export default medicationRouter;
