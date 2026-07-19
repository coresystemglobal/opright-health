import express, { Request, Response } from 'express';
import patientPortalController from './patient-portal.controller';
import authentication from '@middlewares/authentication';
import { optionalTenantMiddleware } from '@middlewares/optional-tenant.middleware';

/**
 * Patient self-service portal. Every route is authenticated; tenant resolves
 * from x-tenant-id when present, otherwise falls back to the direct-to-consumer
 * platform tenant, so a self-enrolled consumer sees their own platform records.
 * The controller resolves the caller's own patient record from their user id,
 * so a patient can only ever access their own data.
 */
const patientPortalRouter = express.Router();

patientPortalRouter.get('/dashboard',
  optionalTenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getDashboard(req, res)
);

patientPortalRouter.get('/profile',
  optionalTenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getProfile(req, res)
);

patientPortalRouter.get('/appointments',
  optionalTenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getAppointments(req, res)
);

patientPortalRouter.get('/prescriptions',
  optionalTenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getPrescriptions(req, res)
);

patientPortalRouter.get('/invoices',
  optionalTenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getInvoices(req, res)
);

patientPortalRouter.get('/lab-results',
  optionalTenantMiddleware,
  authentication,
  (req: Request, res: Response) => patientPortalController.getLabResults(req, res)
);

export default patientPortalRouter;
