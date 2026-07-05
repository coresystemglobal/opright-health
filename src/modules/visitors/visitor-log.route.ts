import express, { Request, Response } from 'express';
import visitorLogController from './visitor-log.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateQuery, validateParams, genericValidation } from '@utils/validator';
import { visitorValidation } from '@utils/validators/visitor.validator';

const visitorRouter = express.Router();

visitorRouter.post('/check-in',
  validate(visitorValidation.checkIn),
  async (req: Request, res: Response) => {
    await visitorLogController.checkIn(req, res);
  }
);

visitorRouter.post('/check-out/:id',
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await visitorLogController.checkOut(req, res);
  }
);

visitorRouter.get('/lookup',
  validateQuery(visitorValidation.lookup),
  async (req: Request, res: Response) => {
    await visitorLogController.lookupByPhone(req, res);
  }
);

visitorRouter.get('/active',
  authentication,
  checkPermission(PERMISSIONS.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    await visitorLogController.getActive(req, res);
  }
);

visitorRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.QUEUE_VIEW),
  validateQuery(visitorValidation.list),
  async (req: Request, res: Response) => {
    await visitorLogController.getAll(req, res);
  }
);

visitorRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.QUEUE_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await visitorLogController.getById(req, res);
  }
);

export default visitorRouter;
