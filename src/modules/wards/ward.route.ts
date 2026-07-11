import express, { Request, Response } from 'express';
import wardController from './ward.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, wardValidation, genericValidation } from '@utils/validator';

const wardRouter = express.Router();

wardRouter.post('/', authentication, tenantMiddleware, validate(wardValidation.create),
  (req: Request, res: Response) => wardController.createWard(req, res));

wardRouter.get('/', authentication, tenantMiddleware, validateQuery(wardValidation.list),
  (req: Request, res: Response) => wardController.getWards(req, res));

wardRouter.get('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id),
  (req: Request, res: Response) => wardController.getWardById(req, res));

wardRouter.get('/:id/availability', authentication, tenantMiddleware, validateParams(genericValidation.id),
  (req: Request, res: Response) => wardController.getWardAvailability(req, res));

wardRouter.put('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id), validate(wardValidation.update),
  (req: Request, res: Response) => wardController.updateWard(req, res));

wardRouter.delete('/:id', authentication, tenantMiddleware, validateParams(genericValidation.id),
  (req: Request, res: Response) => wardController.deleteWard(req, res));

export default wardRouter;
