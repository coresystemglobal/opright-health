import express, { Request, Response } from 'express';
import complianceController from './compliance.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, complianceValidation, genericValidation } from '@utils/validator';

const complianceRouter = express.Router();
const auth = [authentication, tenantMiddleware];
// Data-subject operations are restricted to staff who can manage patients
const canManage = checkPermission(PERMISSIONS.PATIENT_UPDATE);

// ── Data subject rights (right to access / erasure) ─────────────────────────
complianceRouter.get('/patients/:patientId/export', ...auth, canManage,
  (req: Request, res: Response) => complianceController.exportPatientData(req, res));

complianceRouter.post('/patients/:patientId/anonymize', ...auth, canManage,
  (req: Request, res: Response) => complianceController.anonymizePatient(req, res));

// ── Consent ──────────────────────────────────────────────────────────────────
complianceRouter.post('/consent', ...auth, validate(complianceValidation.recordConsent),
  (req: Request, res: Response) => complianceController.recordConsent(req, res));

complianceRouter.post('/consent/withdraw', ...auth, validate(complianceValidation.withdrawConsent),
  (req: Request, res: Response) => complianceController.withdrawConsent(req, res));

complianceRouter.get('/consent/patient/:patientId', ...auth,
  (req: Request, res: Response) => complianceController.getPatientConsents(req, res));

// ── Consent signatures (digital signature capture) ──────────────────────────
complianceRouter.post('/consent/:consentId/sign', ...auth, validate(complianceValidation.signConsent),
  (req: Request, res: Response) => complianceController.signConsent(req, res));

complianceRouter.get('/consent/:consentId/signatures', ...auth,
  (req: Request, res: Response) => complianceController.getConsentSignatures(req, res));

complianceRouter.get('/signatures/:id/verify', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => complianceController.verifySignature(req, res));

// ── Data subject requests ────────────────────────────────────────────────────
complianceRouter.post('/requests', ...auth, validate(complianceValidation.createRequest),
  (req: Request, res: Response) => complianceController.createRequest(req, res));

complianceRouter.get('/requests', ...auth, validateQuery(complianceValidation.listRequests),
  (req: Request, res: Response) => complianceController.listRequests(req, res));

complianceRouter.get('/requests/:id', ...auth, validateParams(genericValidation.id),
  (req: Request, res: Response) => complianceController.getRequest(req, res));

complianceRouter.patch('/requests/:id/status', ...auth, canManage, validateParams(genericValidation.id), validate(complianceValidation.updateStatus),
  (req: Request, res: Response) => complianceController.updateRequestStatus(req, res));

// ── Retention ────────────────────────────────────────────────────────────────
complianceRouter.get('/retention/preview', ...auth, canManage, validateQuery(complianceValidation.retention),
  (req: Request, res: Response) => complianceController.retentionPreview(req, res));

export default complianceRouter;
