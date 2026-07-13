import express, { Request, Response } from 'express';
import telemedicineController from './telemedicine.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, telemedicineValidation, genericValidation } from '@utils/validator';

const telemedicineRouter = express.Router();
const auth = [authentication, tenantMiddleware];
const wrap = (fn: (req: Request, res: Response) => Promise<Response>) => (req: Request, res: Response) => fn(req, res);

telemedicineRouter.post('/sessions', ...auth, validate(telemedicineValidation.create), wrap(telemedicineController.create));
telemedicineRouter.get('/sessions', ...auth, validateQuery(telemedicineValidation.list), wrap(telemedicineController.list));
telemedicineRouter.get('/sessions/:id', ...auth, validateParams(genericValidation.id), wrap(telemedicineController.get));
telemedicineRouter.patch('/sessions/:id/start', ...auth, validateParams(genericValidation.id), wrap(telemedicineController.start));
telemedicineRouter.patch('/sessions/:id/end', ...auth, validateParams(genericValidation.id), validate(telemedicineValidation.end), wrap(telemedicineController.end));
telemedicineRouter.patch('/sessions/:id/cancel', ...auth, validateParams(genericValidation.id), validate(telemedicineValidation.cancel), wrap(telemedicineController.cancel));

export default telemedicineRouter;
