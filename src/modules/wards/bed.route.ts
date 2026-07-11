import express, { Request, Response } from 'express';
import bedController from './bed.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, bedValidation, genericValidation } from '@utils/validator';

const bedRouter = express.Router();

// Hospital-wide / per-hospital availability board
bedRouter.get('/board', authentication, tenantMiddleware, validateQuery(bedValidation.board),
  (req: Request, res: Response) => bedController.getAvailabilityBoard(req, res));

bedRouter.post('/', authentication, tenantMiddleware, validate(bedValidation.create),
  (req: Request, res: Response) => bedController.createBed(req, res));

bedRouter.get('/ward/:wardId', authentication, tenantMiddleware, validateQuery(bedValidation.list),
  (req: Request, res: Response) => bedController.getBedsByWard(req, res));

bedRouter.get('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id),
  (req: Request, res: Response) => bedController.getBedById(req, res));

bedRouter.put('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id), validate(bedValidation.update),
  (req: Request, res: Response) => bedController.updateBed(req, res));

bedRouter.patch('/:id/status', authentication, tenantMiddleware, validateParams(genericValidation.id), validate(bedValidation.changeStatus),
  (req: Request, res: Response) => bedController.changeBedStatus(req, res));

bedRouter.delete('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id),
  (req: Request, res: Response) => bedController.deleteBed(req, res));

export default bedRouter;
