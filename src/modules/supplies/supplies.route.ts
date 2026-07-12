import express, { Request, Response } from 'express';
import suppliesController from './supplies.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, supplyValidation, genericValidation } from '@utils/validator';

const suppliesRouter = express.Router();
const auth = [authentication, tenantMiddleware];

// ── Alerts & audit (before /:id) ────────────────────────────────────────────
suppliesRouter.get('/alerts/low-stock', ...auth,
  (req: Request, res: Response) => suppliesController.lowStock(req, res));
suppliesRouter.get('/movements', ...auth, validateQuery(supplyValidation.movements),
  (req: Request, res: Response) => suppliesController.movements(req, res));

// ── Equipment (before /items to keep paths clear) ───────────────────────────
suppliesRouter.get('/equipment/alerts/maintenance-due', ...auth,
  (req: Request, res: Response) => suppliesController.maintenanceDue(req, res));
suppliesRouter.post('/equipment', ...auth, validate(supplyValidation.createEquipment),
  (req: Request, res: Response) => suppliesController.createEquipment(req, res));
suppliesRouter.get('/equipment', ...auth, validateQuery(supplyValidation.listEquipment),
  (req: Request, res: Response) => suppliesController.listEquipment(req, res));
suppliesRouter.get('/equipment/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => suppliesController.getEquipment(req, res));
suppliesRouter.put('/equipment/:id', ...auth, validateParams(genericValidation.id), validate(supplyValidation.updateEquipment),
  (req: Request, res: Response) => suppliesController.updateEquipment(req, res));
suppliesRouter.patch('/equipment/:id/status', ...auth, validateParams(genericValidation.id), validate(supplyValidation.equipmentStatus),
  (req: Request, res: Response) => suppliesController.changeEquipmentStatus(req, res));
suppliesRouter.patch('/equipment/:id/maintenance', ...auth, validateParams(genericValidation.id), validate(supplyValidation.maintenance),
  (req: Request, res: Response) => suppliesController.recordMaintenance(req, res));
suppliesRouter.delete('/equipment/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => suppliesController.deleteEquipment(req, res));

// ── Supply items & stock ─────────────────────────────────────────────────────
suppliesRouter.post('/items', ...auth, validate(supplyValidation.createItem),
  (req: Request, res: Response) => suppliesController.createItem(req, res));
suppliesRouter.get('/items', ...auth, validateQuery(supplyValidation.listItems),
  (req: Request, res: Response) => suppliesController.listItems(req, res));
suppliesRouter.get('/items/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => suppliesController.getItem(req, res));
suppliesRouter.put('/items/:id', ...auth, validateParams(genericValidation.id), validate(supplyValidation.updateItem),
  (req: Request, res: Response) => suppliesController.updateItem(req, res));
suppliesRouter.delete('/items/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => suppliesController.deleteItem(req, res));

suppliesRouter.post('/items/:id/receive', ...auth, validateParams(genericValidation.id), validate(supplyValidation.receive),
  (req: Request, res: Response) => suppliesController.receive(req, res));
suppliesRouter.post('/items/:id/issue', ...auth, validateParams(genericValidation.id), validate(supplyValidation.issue),
  (req: Request, res: Response) => suppliesController.issue(req, res));
suppliesRouter.patch('/items/:id/adjust', ...auth, validateParams(genericValidation.id), validate(supplyValidation.adjust),
  (req: Request, res: Response) => suppliesController.adjust(req, res));
suppliesRouter.post('/items/:id/wastage', ...auth, validateParams(genericValidation.id), validate(supplyValidation.wastage),
  (req: Request, res: Response) => suppliesController.wastage(req, res));

export default suppliesRouter;
