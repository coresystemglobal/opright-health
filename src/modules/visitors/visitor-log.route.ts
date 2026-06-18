import express, { Request, Response } from 'express';
import visitorLogController from './visitor-log.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateQuery, validateParams, genericValidation } from '@utils/validator';
import { visitorValidation } from '@utils/validators/visitor.validator';

const visitorRouter = express.Router();

// PUBLIC: Self-service check-in (kiosk/tablet facing)
visitorRouter.post('/check-in',
  validate(visitorValidation.checkIn),
  async (req: Request, res: Response) => {
    await visitorLogController.checkIn(req, res);
  }
);

// PUBLIC: Self-service check-out by visitor ID
visitorRouter.post('/check-out/:id',
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await visitorLogController.checkOut(req, res);
  }
);

// PUBLIC: Lookup active check-ins by phone (to find ID for self-checkout)
visitorRouter.get('/lookup',
  validateQuery(visitorValidation.lookup),
  async (req: Request, res: Response) => {
    await visitorLogController.lookupByPhone(req, res);
  }
);

// STAFF: View all currently checked-in visitors
visitorRouter.get('/active',
  authentication,
  checkPermission(PERMISSIONS.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    await visitorLogController.getActive(req, res);
  }
);

// STAFF: List all visitor logs with pagination + filters
visitorRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.QUEUE_VIEW),
  validateQuery(visitorValidation.list),
  async (req: Request, res: Response) => {
    await visitorLogController.getAll(req, res);
  }
);

// STAFF: Get a single visitor log entry
visitorRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.QUEUE_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await visitorLogController.getById(req, res);
  }
);

export default visitorRouter;
