import { InsuranceClaim, InsuranceProvider, PatientInsurancePolicy, Patient } from '../../models';
import { ClaimType, ClaimStatus } from '@modules/insurance/claim.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateClaimData {
  claim_type?: ClaimType;
  patient_id: string;
  insurance_provider_id: string;
  policy_id?: string;
  invoice_id?: string;
  service_date?: string;
  claimed_amount: number;
  diagnosis?: string;
  notes?: string;
  created_by: string;
  tenant_id: string;
}

const includes = [
  { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'] },
  { model: InsuranceProvider, as: 'provider', attributes: ['id', 'name', 'code'] },
  { model: PatientInsurancePolicy, as: 'policy', attributes: ['id', 'policy_number', 'coverage_percentage'] }
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Split an amount into insurance-covered and patient co-pay by coverage %. */
export function computeCoverage(amount: number, coveragePercentage: number) {
  const pct = Math.max(0, Math.min(100, coveragePercentage));
  const insurance_covers = round2(amount * (pct / 100));
  const copay = round2(amount - insurance_covers);
  return { amount: round2(amount), coverage_percentage: pct, insurance_covers, copay };
}

function generateClaimNumber(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  return `CLM-${t}${r}`;
}

export const claimService = {
  /** Estimate the insurance/co-pay split for an amount, from a policy or an explicit coverage %. */
  estimate: async (amount: number, opts: { policy_id?: string; coverage_percentage?: number }) => {
    if (!(amount > 0)) throw new Error('amount must be a positive number');
    let coverage = opts.coverage_percentage;
    if (opts.policy_id) {
      if (!ValidationUtil.isValidUUID(opts.policy_id)) throw new Error('Invalid policy ID format');
      const policy = await PatientInsurancePolicy.findByPk(opts.policy_id);
      if (!policy) throw new Error('Policy not found');
      coverage = policy.coverage_percentage;
    }
    if (coverage === undefined) throw new Error('Provide either policy_id or coverage_percentage');
    return computeCoverage(amount, coverage);
  },

  createClaim: async (data: CreateClaimData) => {
    const { patient_id, insurance_provider_id, tenant_id, created_by, claimed_amount } = data;
    if (!patient_id || !insurance_provider_id || !tenant_id || !created_by) {
      throw new Error('patient_id, insurance_provider_id, and tenant context are required');
    }
    if (!(claimed_amount > 0)) throw new Error('claimed_amount must be a positive number');
    for (const id of [patient_id, insurance_provider_id, created_by, tenant_id]) {
      if (!ValidationUtil.isValidUUID(id)) throw new Error(`Invalid UUID format: ${id}`);
    }

    const provider = await InsuranceProvider.findByPk(insurance_provider_id);
    if (!provider) throw new Error('Insurance provider not found');
    if (provider.tenant_id !== tenant_id) throw new Error('Provider does not belong to this tenant');

    // If a policy is given, use its coverage to pre-compute the expected co-pay
    let copay: number | null = null;
    if (data.policy_id) {
      if (!ValidationUtil.isValidUUID(data.policy_id)) throw new Error('Invalid policy ID format');
      const policy = await PatientInsurancePolicy.findByPk(data.policy_id);
      if (!policy) throw new Error('Policy not found');
      if (policy.patient_id !== patient_id) throw new Error('Policy does not belong to this patient');
      copay = computeCoverage(claimed_amount, policy.coverage_percentage).copay;
    }

    return InsuranceClaim.create({
      claim_number: generateClaimNumber(),
      claim_type: data.claim_type || ClaimType.CLAIM,
      patient_id,
      insurance_provider_id,
      policy_id: data.policy_id || null,
      invoice_id: data.invoice_id || null,
      status: ClaimStatus.DRAFT,
      service_date: data.service_date || null,
      claimed_amount,
      copay_amount: copay,
      diagnosis: data.diagnosis || null,
      notes: data.notes || null,
      created_by,
      tenant_id
    } as any);
  },

  submitClaim: async (claimId: string) => {
    const claim = await claimService._find(claimId);
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new Error(`Only a draft claim can be submitted (current: ${claim.status})`);
    }
    await claim.update({ status: ClaimStatus.SUBMITTED, submitted_at: new Date() });
    return claim;
  },

  /**
   * Record the insurer's decision.
   *  - approve: approved_amount required; full → approved, partial → partially_approved.
   *             co-pay recomputed as claimed − approved.
   *  - reject:  rejection_reason required.
   */
  recordDecision: async (
    claimId: string,
    decision: 'approve' | 'reject',
    payload: { approved_amount?: number; rejection_reason?: string; authorization_code?: string }
  ) => {
    const claim = await claimService._find(claimId);
    if (![ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW].includes(claim.status)) {
      throw new Error(`A decision can only be recorded on a submitted claim (current: ${claim.status})`);
    }

    if (decision === 'reject') {
      if (!payload.rejection_reason || !payload.rejection_reason.trim()) throw new Error('rejection_reason is required to reject');
      await claim.update({ status: ClaimStatus.REJECTED, rejection_reason: payload.rejection_reason, decided_at: new Date() });
      return claim;
    }

    // approve
    const approved = payload.approved_amount;
    if (approved === undefined || !(approved > 0)) throw new Error('approved_amount must be a positive number to approve');
    const claimed = parseFloat(claim.claimed_amount.toString());
    if (approved > claimed) throw new Error('approved_amount cannot exceed claimed_amount');

    const status = approved >= claimed ? ClaimStatus.APPROVED : ClaimStatus.PARTIALLY_APPROVED;
    await claim.update({
      status,
      approved_amount: approved,
      copay_amount: round2(claimed - approved),
      authorization_code: payload.authorization_code || claim.authorization_code || null,
      decided_at: new Date()
    });
    return claim;
  },

  markPaid: async (claimId: string) => {
    const claim = await claimService._find(claimId);
    if (![ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED].includes(claim.status)) {
      throw new Error(`Only an approved claim can be marked paid (current: ${claim.status})`);
    }
    await claim.update({ status: ClaimStatus.PAID, paid_at: new Date() });
    return claim;
  },

  cancelClaim: async (claimId: string, reason?: string) => {
    const claim = await claimService._find(claimId);
    if ([ClaimStatus.PAID, ClaimStatus.REJECTED, ClaimStatus.CANCELLED].includes(claim.status)) {
      throw new Error(`A ${claim.status} claim cannot be cancelled`);
    }
    await claim.update({ status: ClaimStatus.CANCELLED, notes: reason ? `${claim.notes || ''}\nCancelled: ${reason}`.trim() : claim.notes });
    return claim;
  },

  listClaims: async (tenantId: string, paginationQuery: PaginationQuery, filters: { status?: ClaimStatus; patient_id?: string; insurance_provider_id?: string } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.patient_id) where.patient_id = filters.patient_id;
    if (filters.insurance_provider_id) where.insurance_provider_id = filters.insurance_provider_id;

    const { count, rows: claims } = await InsuranceClaim.findAndCountAll({
      where,
      include: includes,
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      distinct: true,
      paranoid: true
    });
    return { claims, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getClaimById: async (claimId: string) => {
    const claim = await InsuranceClaim.findByPk(claimId, { include: includes });
    if (!claim) throw new Error('Claim not found');
    return claim;
  },

  _find: async (claimId: string) => {
    if (!ValidationUtil.isValidUUID(claimId)) throw new Error('Invalid claim ID format');
    const claim = await InsuranceClaim.findByPk(claimId);
    if (!claim) throw new Error('Claim not found');
    return claim;
  }
};
