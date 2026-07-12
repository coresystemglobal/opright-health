import express, { Request, Response } from 'express';
import pharmacyController from './pharmacy.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, pharmacyValidation, genericValidation } from '@utils/validator';

const pharmacyRouter = express.Router();
const auth = [authentication, tenantMiddleware];

// ── Alerts & audit (before /:id catch-alls) ─────────────────────────────────
pharmacyRouter.get('/alerts/low-stock', ...auth,
  (req: Request, res: Response) => pharmacyController.lowStock(req, res));

pharmacyRouter.get('/alerts/expiring', ...auth, validateQuery(pharmacyValidation.expiring),
  (req: Request, res: Response) => pharmacyController.expiring(req, res));

pharmacyRouter.get('/movements', ...auth, validateQuery(pharmacyValidation.movements),
  (req: Request, res: Response) => pharmacyController.movements(req, res));

// Stock adjustment on a specific batch
pharmacyRouter.patch('/batches/:batchId/adjust', ...auth, validate(pharmacyValidation.adjust),
  (req: Request, res: Response) => pharmacyController.adjustStock(req, res));

// ── Items ────────────────────────────────────────────────────────────────────
pharmacyRouter.post('/items', ...auth, validate(pharmacyValidation.createItem),
  (req: Request, res: Response) => pharmacyController.createItem(req, res));

pharmacyRouter.get('/items', ...auth, validateQuery(pharmacyValidation.listItems),
  (req: Request, res: Response) => pharmacyController.listItems(req, res));

pharmacyRouter.get('/items/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => pharmacyController.getItem(req, res));

pharmacyRouter.put('/items/:id', ...auth, validateParams(genericValidation.id), validate(pharmacyValidation.updateItem),
  (req: Request, res: Response) => pharmacyController.updateItem(req, res));

pharmacyRouter.delete('/items/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => pharmacyController.deleteItem(req, res));

// ── Stock operations on an item ──────────────────────────────────────────────
pharmacyRouter.get('/items/:id/stock', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => pharmacyController.getStockLevel(req, res));

pharmacyRouter.post('/items/:id/receive', ...auth, validateParams(genericValidation.id), validate(pharmacyValidation.receive),
  (req: Request, res: Response) => pharmacyController.receiveStock(req, res));

pharmacyRouter.post('/items/:id/dispense', ...auth, validateParams(genericValidation.id), validate(pharmacyValidation.dispense),
  (req: Request, res: Response) => pharmacyController.dispenseStock(req, res));

export default pharmacyRouter;
