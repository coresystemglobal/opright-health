import express, { Request, Response } from 'express';
import vitalSignController from './vital-sign.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, validateQuery, vitalSignValidation, genericValidation } from '@utils/validator';

const vitalSignRouter = express.Router();

vitalSignRouter.post('/',
  authentication,
  validate(vitalSignValidation.create),
  async (req: Request, res: Response) => {
    await vitalSignController.recordVitalSign(req, res);
  }
);

// Time-series for charting — must precede /patient/:patientId
vitalSignRouter.get('/patient/:patientId/trends',
  authentication,
  validateQuery(vitalSignValidation.trends),
  async (req: Request, res: Response) => {
    await vitalSignController.getTrends(req, res);
  }
);

vitalSignRouter.get('/patient/:patientId/latest',
  authentication,
  async (req: Request, res: Response) => {
    await vitalSignController.getLatestVitalSign(req, res);
  }
);

vitalSignRouter.get('/patient/:patientId',
  authentication,
  validateQuery(vitalSignValidation.search),
  async (req: Request, res: Response) => {
    await vitalSignController.getPatientVitalSigns(req, res);
  }
);

vitalSignRouter.get('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await vitalSignController.getVitalSignById(req, res);
  }
);

vitalSignRouter.put('/:id',
  authentication,
  validateParams(genericValidation.id),
  validate(vitalSignValidation.update),
  async (req: Request, res: Response) => {
    await vitalSignController.updateVitalSign(req, res);
  }
);

vitalSignRouter.delete('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await vitalSignController.deleteVitalSign(req, res);
  }
);

export default vitalSignRouter;
