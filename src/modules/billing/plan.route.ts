import express, { Request, Response } from 'express';
import planController from './plan.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, planValidation, genericValidation } from '@utils/validator';

// Platform-level subscription plan catalogue admin (SUPER_ADMIN via RBAC).
// NOT tenant-scoped — plans are global. The public catalogue stays at
// GET /api/billing/plans.
const planRouter = express.Router();

planRouter.get('/', authentication, checkPermission(PERMISSIONS.PLAN_VIEW),
  (req: Request, res: Response) => planController.list(req, res));

planRouter.get('/:id', authentication, checkPermission(PERMISSIONS.PLAN_VIEW), validateParams(genericValidation.id),
  (req: Request, res: Response) => planController.get(req, res));

planRouter.post('/', authentication, checkPermission(PERMISSIONS.PLAN_MANAGE), validate(planValidation.create),
  (req: Request, res: Response) => planController.create(req, res));

planRouter.put('/:id', authentication, checkPermission(PERMISSIONS.PLAN_MANAGE), validateParams(genericValidation.id), validate(planValidation.update),
  (req: Request, res: Response) => planController.update(req, res));

planRouter.delete('/:id', authentication, checkPermission(PERMISSIONS.PLAN_MANAGE), validateParams(genericValidation.id),
  (req: Request, res: Response) => planController.remove(req, res));

export default planRouter;
