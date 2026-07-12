import { Request, Response } from 'express';
import { insuranceProviderService } from '@modules/insurance/insurance-provider.service';
import { patientPolicyService } from '@modules/insurance/patient-policy.service';
import { claimService } from '@modules/insurance/claim.service';
import { ClaimStatus } from '@modules/insurance/claim.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('cannot') || msg.includes('Only a') || msg.includes('can only')) return ResponseUtil.validationError(res, [msg]);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be') || msg.includes('does not belong') || msg.includes('between')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const insuranceController = {
  // ── Providers ──────────────────────────────────────────────────────────────
  createProvider: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const provider = await insuranceProviderService.createProvider({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, provider, 'Insurance provider created successfully', 201);
    } catch (e) { return fail(res, e, 'create provider'); }
  },
  listProviders: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { q, is_active } = req.query as Record<string, string>;
      const r = await insuranceProviderService.listProviders(tenantId, paged(req), { q, is_active: is_active === undefined ? undefined : is_active === 'true' });
      return ResponseUtil.paginated(res, r.providers, r.count, r.page, r.limit, 'Providers retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve providers'); }
  },
  getProvider: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await insuranceProviderService.getProviderById(req.params.id), 'Provider retrieved successfully'); }
    catch (e) { return fail(res, e, 'retrieve provider'); }
  },
  updateProvider: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await insuranceProviderService.updateProvider(req.params.id, req.body), 'Provider updated successfully'); }
    catch (e) { return fail(res, e, 'update provider'); }
  },
  deleteProvider: async (req: Request, res: Response): Promise<Response> => {
    try { await insuranceProviderService.deleteProvider(req.params.id); return ResponseUtil.success(res, null, 'Provider deleted successfully'); }
    catch (e) { return fail(res, e, 'delete provider'); }
  },

  // ── Policies ────────────────────────────────────────────────────────────────
  createPolicy: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const policy = await patientPolicyService.createPolicy({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, policy, 'Policy created successfully', 201);
    } catch (e) { return fail(res, e, 'create policy'); }
  },
  getPatientPolicies: async (req: Request, res: Response): Promise<Response> => {
    try {
      const r = await patientPolicyService.getPatientPolicies(req.params.patientId, paged(req));
      return ResponseUtil.paginated(res, r.policies, r.count, r.page, r.limit, 'Policies retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve policies'); }
  },
  getPolicy: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await patientPolicyService.getPolicyById(req.params.id), 'Policy retrieved successfully'); }
    catch (e) { return fail(res, e, 'retrieve policy'); }
  },
  updatePolicy: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await patientPolicyService.updatePolicy(req.params.id, req.body), 'Policy updated successfully'); }
    catch (e) { return fail(res, e, 'update policy'); }
  },
  deletePolicy: async (req: Request, res: Response): Promise<Response> => {
    try { await patientPolicyService.deletePolicy(req.params.id); return ResponseUtil.success(res, null, 'Policy deleted successfully'); }
    catch (e) { return fail(res, e, 'delete policy'); }
  },

  // ── Claims ────────────────────────────────────────────────────────────────
  estimate: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { amount, policy_id, coverage_percentage } = req.body;
      const result = await claimService.estimate(Number(amount), { policy_id, coverage_percentage });
      return ResponseUtil.success(res, result, 'Co-pay estimate calculated successfully');
    } catch (e) { return fail(res, e, 'estimate co-pay'); }
  },
  createClaim: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const claim = await claimService.createClaim({ ...req.body, created_by: userId, tenant_id: tenantId });
      return ResponseUtil.success(res, claim, 'Claim created successfully', 201);
    } catch (e) { return fail(res, e, 'create claim'); }
  },
  listClaims: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { status, patient_id, insurance_provider_id } = req.query as Record<string, string>;
      const r = await claimService.listClaims(tenantId, paged(req), { status: status as ClaimStatus, patient_id, insurance_provider_id });
      return ResponseUtil.paginated(res, r.claims, r.count, r.page, r.limit, 'Claims retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve claims'); }
  },
  getClaim: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await claimService.getClaimById(req.params.id), 'Claim retrieved successfully'); }
    catch (e) { return fail(res, e, 'retrieve claim'); }
  },
  submitClaim: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await claimService.submitClaim(req.params.id), 'Claim submitted successfully'); }
    catch (e) { return fail(res, e, 'submit claim'); }
  },
  decideClaim: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { decision, approved_amount, rejection_reason, authorization_code } = req.body;
      const claim = await claimService.recordDecision(req.params.id, decision, { approved_amount, rejection_reason, authorization_code });
      return ResponseUtil.success(res, claim, 'Claim decision recorded successfully');
    } catch (e) { return fail(res, e, 'record claim decision'); }
  },
  payClaim: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await claimService.markPaid(req.params.id), 'Claim marked paid successfully'); }
    catch (e) { return fail(res, e, 'mark claim paid'); }
  },
  cancelClaim: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await claimService.cancelClaim(req.params.id, req.body?.reason), 'Claim cancelled successfully'); }
    catch (e) { return fail(res, e, 'cancel claim'); }
  }
};

export default insuranceController;
