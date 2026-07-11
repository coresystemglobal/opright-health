import express, { Request, Response } from 'express';
import prescriptionController from './prescription.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, validateQuery, prescriptionValidation, genericValidation } from '@utils/validator';

const prescriptionRouter = express.Router();

prescriptionRouter.post('/',
  authentication,
  validate(prescriptionValidation.create),
  async (req: Request, res: Response) => {
    await prescriptionController.createPrescription(req, res);
  }
);

prescriptionRouter.get('/patient/:patientId',
  authentication,
  validateQuery(prescriptionValidation.search),
  async (req: Request, res: Response) => {
    await prescriptionController.getPatientPrescriptions(req, res);
  }
);

prescriptionRouter.get('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await prescriptionController.getPrescriptionById(req, res);
  }
);

// Send to pharmacy
prescriptionRouter.patch('/:id/send-to-pharmacy',
  authentication,
  validateParams(genericValidation.id),
  validate(prescriptionValidation.sendToPharmacy),
  async (req: Request, res: Response) => {
    await prescriptionController.sendToPharmacy(req, res);
  }
);

// Dispense (full or partial via item_ids)
prescriptionRouter.patch('/:id/dispense',
  authentication,
  validateParams(genericValidation.id),
  validate(prescriptionValidation.dispense),
  async (req: Request, res: Response) => {
    await prescriptionController.dispense(req, res);
  }
);

// Cancel
prescriptionRouter.patch('/:id/cancel',
  authentication,
  validateParams(genericValidation.id),
  validate(prescriptionValidation.cancel),
  async (req: Request, res: Response) => {
    await prescriptionController.cancel(req, res);
  }
);

export default prescriptionRouter;
