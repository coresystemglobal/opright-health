import express, { Request, Response } from 'express';
import patientPortalController from './patient-portal.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';

/**
 * Patient self-service portal. Every route is authenticated and tenant-scoped;
 * the controller resolves the caller's own patient record from their user id,
 * so a patient can only ever access their own data.
 */
const patientPortalRouter = express.Router();

patientPortalRouter.get('/dashboard',
  tenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getDashboard(req, res)
);

patientPortalRouter.get('/profile',
  tenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getProfile(req, res)
);

patientPortalRouter.get('/appointments',
  tenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getAppointments(req, res)
);

patientPortalRouter.get('/prescriptions',
  tenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getPrescriptions(req, res)
);

patientPortalRouter.get('/invoices',
  tenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getInvoices(req, res)
);

patientPortalRouter.get('/lab-results',
  tenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getLabResults(req, res)
);

export default patientPortalRouter;
