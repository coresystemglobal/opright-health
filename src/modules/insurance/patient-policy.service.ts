import { PatientInsurancePolicy, InsuranceProvider } from '../../models';
import { PolicyRelationship, PolicyStatus } from '@modules/insurance/patient-policy.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreatePolicyData {
  patient_id: string;
  insurance_provider_id: string;
  policy_number: string;
  plan_name?: string;
  coverage_percentage?: number;
  holder_name?: string;
  relationship?: PolicyRelationship;
  valid_from?: string;
  valid_to?: string;
  is_primary?: boolean;
  tenant_id: string;
}

const providerInclude = { model: InsuranceProvider, as: 'provider', attributes: ['id', 'name', 'code', 'provider_type'] };

export const patientPolicyService = {
  createPolicy: async (data: CreatePolicyData) => {
    const { patient_id, insurance_provider_id, policy_number, tenant_id } = data;
    if (!patient_id || !insurance_provider_id || !policy_number || !tenant_id) {
      throw new Error('patient_id, insurance_provider_id, policy_number, and tenant context are required');
    }
    for (const id of [patient_id, insurance_provider_id, tenant_id]) {
      if (!ValidationUtil.isValidUUID(id)) throw new Error(`Invalid UUID format: ${id}`);
    }
    if (data.coverage_percentage !== undefined && (data.coverage_percentage < 0 || data.coverage_percentage > 100)) {
      throw new Error('coverage_percentage must be between 0 and 100');
    }

    const provider = await InsuranceProvider.findByPk(insurance_provider_id);
    if (!provider) throw new Error('Insurance provider not found');
    if (provider.tenant_id !== tenant_id) throw new Error('Provider does not belong to this tenant');

    // Demote any existing primary if this one is primary
    if (data.is_primary) {
      await PatientInsurancePolicy.update({ is_primary: false }, { where: { patient_id, is_primary: true } });
    }

    return PatientInsurancePolicy.create({
      patient_id,
      insurance_provider_id,
      policy_number,
      plan_name: data.plan_name || null,
      coverage_percentage: data.coverage_percentage ?? 0,
      holder_name: data.holder_name || null,
      relationship: data.relationship || PolicyRelationship.SELF,
      valid_from: data.valid_from || null,
      valid_to: data.valid_to || null,
      is_primary: data.is_primary ?? false,
      status: PolicyStatus.ACTIVE,
      tenant_id
    } as any);
  },

  getPatientPolicies: async (patientId: string, paginationQuery: PaginationQuery) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const { count, rows: policies } = await PatientInsurancePolicy.findAndCountAll({
      where: { patient_id: patientId },
      include: [providerInclude],
      order: [['is_primary', 'DESC'], ['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { policies, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getPolicyById: async (policyId: string) => {
    if (!ValidationUtil.isValidUUID(policyId)) throw new Error('Invalid policy ID format');
    const policy = await PatientInsurancePolicy.findByPk(policyId, { include: [providerInclude] });
    if (!policy) throw new Error('Policy not found');
    return policy;
  },

  updatePolicy: async (policyId: string, updateData: Partial<CreatePolicyData> & { is_primary?: boolean; status?: PolicyStatus }) => {
    if (!ValidationUtil.isValidUUID(policyId)) throw new Error('Invalid policy ID format');
    const policy = await PatientInsurancePolicy.findByPk(policyId);
    if (!policy) throw new Error('Policy not found');
    if (updateData.coverage_percentage !== undefined && (updateData.coverage_percentage < 0 || updateData.coverage_percentage > 100)) {
      throw new Error('coverage_percentage must be between 0 and 100');
    }
    if (updateData.is_primary) {
      await PatientInsurancePolicy.update(
        { is_primary: false },
        { where: { patient_id: policy.patient_id, is_primary: true } }
      );
    }
    await policy.update(updateData);
    return policy;
  },

  deletePolicy: async (policyId: string) => {
    if (!ValidationUtil.isValidUUID(policyId)) throw new Error('Invalid policy ID format');
    const policy = await PatientInsurancePolicy.findByPk(policyId);
    if (!policy) throw new Error('Policy not found');
    await policy.destroy();
    return true;
  }
};
