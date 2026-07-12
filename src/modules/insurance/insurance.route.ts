import express, { Request, Response } from 'express';
import insuranceController from './insurance.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, insuranceValidation, genericValidation } from '@utils/validator';

const insuranceRouter = express.Router();
const auth = [authentication, tenantMiddleware];

// ── Providers ────────────────────────────────────────────────────────────────
insuranceRouter.post('/providers', ...auth, validate(insuranceValidation.createProvider),
  (req: Request, res: Response) => insuranceController.createProvider(req, res));
insuranceRouter.get('/providers', ...auth, validateQuery(insuranceValidation.listProviders),
  (req: Request, res: Response) => insuranceController.listProviders(req, res));
insuranceRouter.get('/providers/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.getProvider(req, res));
insuranceRouter.put('/providers/:id', ...auth, validateParams(genericValidation.id), validate(insuranceValidation.updateProvider),
  (req: Request, res: Response) => insuranceController.updateProvider(req, res));
insuranceRouter.delete('/providers/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.deleteProvider(req, res));

// ── Policies ──────────────────────────────────────────────────────────────────
insuranceRouter.post('/policies', ...auth, validate(insuranceValidation.createPolicy),
  (req: Request, res: Response) => insuranceController.createPolicy(req, res));
insuranceRouter.get('/policies/patient/:patientId', ...auth,
  (req: Request, res: Response) => insuranceController.getPatientPolicies(req, res));
insuranceRouter.get('/policies/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.getPolicy(req, res));
insuranceRouter.put('/policies/:id', ...auth, validateParams(genericValidation.id), validate(insuranceValidation.updatePolicy),
  (req: Request, res: Response) => insuranceController.updatePolicy(req, res));
insuranceRouter.delete('/policies/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.deletePolicy(req, res));

// ── Claims ────────────────────────────────────────────────────────────────────
// Co-pay estimate (before /claims/:id)
insuranceRouter.post('/claims/estimate', ...auth, validate(insuranceValidation.estimate),
  (req: Request, res: Response) => insuranceController.estimate(req, res));

insuranceRouter.post('/claims', ...auth, validate(insuranceValidation.createClaim),
  (req: Request, res: Response) => insuranceController.createClaim(req, res));
insuranceRouter.get('/claims', ...auth, validateQuery(insuranceValidation.listClaims),
  (req: Request, res: Response) => insuranceController.listClaims(req, res));
insuranceRouter.get('/claims/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.getClaim(req, res));
insuranceRouter.patch('/claims/:id/submit', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.submitClaim(req, res));
insuranceRouter.patch('/claims/:id/decision', ...auth, validateParams(genericValidation.id), validate(insuranceValidation.decision),
  (req: Request, res: Response) => insuranceController.decideClaim(req, res));
insuranceRouter.patch('/claims/:id/pay', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => insuranceController.payClaim(req, res));
insuranceRouter.patch('/claims/:id/cancel', ...auth, validateParams(genericValidation.id), validate(insuranceValidation.cancel),
  (req: Request, res: Response) => insuranceController.cancelClaim(req, res));

export default insuranceRouter;
