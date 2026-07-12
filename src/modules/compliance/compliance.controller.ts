import { Request, Response } from 'express';
import { complianceService } from '@modules/compliance/compliance.service';
import { consentService } from '@modules/compliance/consent.service';
import { dataRequestService } from '@modules/compliance/data-request.service';
import { DataRequestStatus, DataRequestType } from '@modules/compliance/data-subject-request.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('already')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('does not belong') || msg.includes('Cannot complete')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const complianceController = {
  // ── Data subject rights ──────────────────────────────────────────────────
  exportPatientData: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const data = await complianceService.exportPatientData(req.params.patientId, tenantId);
      return ResponseUtil.success(res, data, 'Patient data export generated successfully');
    } catch (e) { return fail(res, e, 'export patient data'); }
  },

  anonymizePatient: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const result = await complianceService.anonymizePatient(req.params.patientId, tenantId);
      return ResponseUtil.success(res, result, 'Patient anonymized successfully');
    } catch (e) { return fail(res, e, 'anonymize patient'); }
  },

  // ── Consent ────────────────────────────────────────────────────────────────
  recordConsent: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const consent = await consentService.recordConsent({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, consent, 'Consent recorded successfully', 201);
    } catch (e) { return fail(res, e, 'record consent'); }
  },

  withdrawConsent: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { patient_id, consent_type } = req.body;
      const consent = await consentService.withdrawConsent(patient_id, consent_type, tenantId);
      return ResponseUtil.success(res, consent, 'Consent withdrawn successfully');
    } catch (e) { return fail(res, e, 'withdraw consent'); }
  },

  getPatientConsents: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await consentService.getPatientConsents(req.params.patientId);
      return ResponseUtil.success(res, data, 'Consents retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve consents'); }
  },

  // ── Data subject requests ────────────────────────────────────────────────
  createRequest: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const request = await dataRequestService.createRequest({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, request, 'Data subject request created successfully', 201);
    } catch (e) { return fail(res, e, 'create request'); }
  },

  listRequests: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { status, request_type, patient_id } = req.query as Record<string, string>;
      const r = await dataRequestService.listRequests(tenantId, paged(req), {
        status: status as DataRequestStatus, request_type: request_type as DataRequestType, patient_id
      });
      return ResponseUtil.paginated(res, r.requests, r.count, r.page, r.limit, 'Requests retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve requests'); }
  },

  getRequest: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await dataRequestService.getRequestById(req.params.id), 'Request retrieved successfully'); }
    catch (e) { return fail(res, e, 'retrieve request'); }
  },

  updateRequestStatus: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = userOf(req);
      if (!userId) return ResponseUtil.unauthorized(res);
      const { status, result_notes } = req.body;
      const result = await dataRequestService.updateStatus(req.params.id, status, userId, result_notes);
      return ResponseUtil.success(res, result, 'Request updated successfully');
    } catch (e) { return fail(res, e, 'update request'); }
  },

  // ── Retention ────────────────────────────────────────────────────────────
  retentionPreview: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const years = req.query.years ? parseInt(req.query.years as string, 10) : 7;
      const data = await dataRequestService.retentionPreview(tenantId, isNaN(years) ? 7 : years);
      return ResponseUtil.success(res, data, 'Retention preview generated successfully');
    } catch (e) { return fail(res, e, 'generate retention preview'); }
  }
};

export default complianceController;
