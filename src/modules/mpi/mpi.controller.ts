import { Request, Response } from 'express';
import { personService } from '@modules/mpi/person.service';
import { recordShareService } from '@modules/mpi/record-share.service';
import { ShareScope } from '@modules/mpi/patient-record-share.model';
import { ResponseUtil } from '@utils/response.util';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('required') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const mpiController = {
  // POST /api/patients/:id/link-person
  linkPerson: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { person_id, person_draft } = req.body;
      const result = await personService.linkPatientToPerson(
        req.params.id, tenantId, { personId: person_id, personDraft: person_draft }, userOf(req)
      );
      return ResponseUtil.success(res, result, 'Patient linked to person identity successfully');
    } catch (e) { return fail(res, e, 'link person'); }
  },

  // DELETE /api/patients/:id/link-person
  unlinkPerson: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const patient = await personService.unlinkPatientFromPerson(req.params.id, tenantId, userOf(req));
      return ResponseUtil.success(res, patient, 'Patient unlinked from person identity successfully');
    } catch (e) { return fail(res, e, 'unlink person'); }
  },

  // GET /api/persons/search
  search: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { national_id, last_name, date_of_birth } = req.query as Record<string, string>;
      const persons = await personService.searchPersons({ national_id, last_name, date_of_birth });
      return ResponseUtil.success(res, persons, 'Persons retrieved successfully');
    } catch (e) { return fail(res, e, 'search persons'); }
  },

  // GET /api/persons/:id
  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      return ResponseUtil.success(res, await personService.getPersonById(req.params.id), 'Person retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve person'); }
  },

  // ── Cross-tenant record sharing (Phase 2) ──────────────────────────────────
  // POST /api/patients/:id/record-shares  (source tenant grants to a recipient)
  createShare: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { recipient_tenant_id, scope, expires_at, consent_signature_id } = req.body;
      const share = await recordShareService.createGrant({
        patientId: req.params.id, sourceTenantId: tenantId, recipientTenantId: recipient_tenant_id,
        scope: scope as ShareScope, expiresAt: expires_at, consentSignatureId: consent_signature_id, actorUserId: userOf(req)
      });
      return ResponseUtil.success(res, share, 'Record share granted successfully', 201);
    } catch (e) { return fail(res, e, 'grant record share'); }
  },

  // POST /api/patients/:id/record-shares/:shareId/revoke
  revokeShare: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const share = await recordShareService.revokeGrant(req.params.shareId, tenantId);
      return ResponseUtil.success(res, share, 'Record share revoked');
    } catch (e) { return fail(res, e, 'revoke record share'); }
  },

  // GET /api/patients/:id/record-shares
  listShares: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const shares = await recordShareService.listGrants(req.params.id, tenantId);
      return ResponseUtil.success(res, shares, 'Record shares retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve record shares'); }
  },

  // GET /api/patients/:id/external-records  (recipient tenant reads shared records)
  externalRecords: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const data = await recordShareService.getExternalRecords(req.params.id, tenantId, userOf(req));
      return ResponseUtil.success(res, data, 'External records retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve external records'); }
  }
};

export default mpiController;
