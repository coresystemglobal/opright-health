import { Op } from 'sequelize';
import {
  PatientRecordShare, Patient, Tenant, AuditLog,
  Allergy, Medication, ClinicalNote, TestOrder, TestResult
} from '../../models';
import { ShareScope, ShareStatus } from '@modules/mpi/patient-record-share.model';
import { AuditAction } from '@modules/audit/audit-log.model';
import { ValidationUtil } from '@utils/validation.util';

interface CreateGrantData {
  patientId: string;       // the SOURCE-tenant patient granting the share
  sourceTenantId: string;  // = the caller's tenant
  recipientTenantId: string;
  scope: ShareScope;
  expiresAt?: string | Date;
  consentSignatureId?: string;
  actorUserId?: string;
}

/** Load a patient within its tenant, or throw. */
async function loadTenantPatient(patientId: string, tenantId: string): Promise<Patient> {
  if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
  const patient = await Patient.findOne({ where: { id: patientId, tenant_id: tenantId } });
  if (!patient) throw new Error('Patient not found');
  return patient;
}

const CATEGORY_SCOPES = [ShareScope.DEMOGRAPHICS, ShareScope.ALLERGIES, ShareScope.MEDICATIONS, ShareScope.LAB_RESULTS, ShareScope.CLINICAL_NOTES];

export const recordShareService = {
  /** The patient authorizes their SOURCE tenant to release records to a recipient tenant. */
  createGrant: async (data: CreateGrantData) => {
    const { patientId, sourceTenantId, recipientTenantId, scope } = data;
    if (!recipientTenantId || !ValidationUtil.isValidUUID(recipientTenantId)) throw new Error('A valid recipient_tenant_id is required');
    if (recipientTenantId === sourceTenantId) throw new Error('recipient_tenant_id must differ from the source tenant');
    if (!Object.values(ShareScope).includes(scope)) throw new Error('Invalid scope');

    const patient = await loadTenantPatient(patientId, sourceTenantId);
    if (!patient.person_id) throw new Error('Patient is not linked to a global person identity; link the patient first');

    const recipient = await Tenant.findByPk(recipientTenantId);
    if (!recipient) throw new Error('Recipient tenant not found');

    return PatientRecordShare.create({
      person_id: patient.person_id,
      source_tenant_id: sourceTenantId,
      recipient_tenant_id: recipientTenantId,
      scope,
      status: ShareStatus.ACTIVE,
      granted_at: new Date(),
      expires_at: data.expiresAt ? new Date(data.expiresAt) : null,
      consent_signature_id: data.consentSignatureId || null
    } as any);
  },

  /** Revoke a grant the source tenant issued. */
  revokeGrant: async (shareId: string, sourceTenantId: string) => {
    if (!ValidationUtil.isValidUUID(shareId)) throw new Error('Invalid share ID format');
    const share = await PatientRecordShare.findOne({ where: { id: shareId, source_tenant_id: sourceTenantId } });
    if (!share) throw new Error('Record share not found');
    if (share.status === ShareStatus.REVOKED) return share;
    await share.update({ status: ShareStatus.REVOKED, revoked_at: new Date() });
    return share;
  },

  /** Grants issued by the source tenant for a given patient's person. */
  listGrants: async (patientId: string, sourceTenantId: string) => {
    const patient = await loadTenantPatient(patientId, sourceTenantId);
    if (!patient.person_id) return [];
    return PatientRecordShare.findAll({
      where: { person_id: patient.person_id, source_tenant_id: sourceTenantId },
      order: [['createdAt', 'DESC']]
    });
  },

  /**
   * Consent-gated cross-tenant read. For a patient in the RECIPIENT tenant,
   * return the records other tenants have shared for the same Person, limited
   * to the granted scope, read-only. Writes an audit entry per access. This is
   * the ONLY sanctioned cross-tenant data path.
   */
  getExternalRecords: async (recipientPatientId: string, recipientTenantId: string, actorUserId?: string) => {
    const patient = await loadTenantPatient(recipientPatientId, recipientTenantId);
    if (!patient.person_id) return { person_id: null, sources: [] };

    const now = new Date();
    const grants = await PatientRecordShare.findAll({
      where: {
        person_id: patient.person_id,
        recipient_tenant_id: recipientTenantId,
        status: ShareStatus.ACTIVE,
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }]
      }
    });

    // Collapse grants into a scope-set per source tenant.
    const scopesBySource: Record<string, Set<ShareScope>> = {};
    for (const g of grants as any[]) {
      if (!scopesBySource[g.source_tenant_id]) scopesBySource[g.source_tenant_id] = new Set();
      if (g.scope === ShareScope.FULL_RECORD) CATEGORY_SCOPES.forEach(s => scopesBySource[g.source_tenant_id].add(s));
      else scopesBySource[g.source_tenant_id].add(g.scope);
    }

    const sources: any[] = [];
    for (const [sourceTenantId, scopes] of Object.entries(scopesBySource)) {
      const sourcePatients = await Patient.findAll({ where: { person_id: patient.person_id, tenant_id: sourceTenantId } });
      for (const sp of sourcePatients) {
        const entry: any = { source_tenant_id: sourceTenantId, source_patient_id: sp.id, scopes: Array.from(scopes) };
        if (scopes.has(ShareScope.DEMOGRAPHICS)) {
          entry.demographics = { mrn: sp.mrn, first_name: sp.first_name, last_name: sp.last_name, date_of_birth: sp.date_of_birth, gender: sp.gender };
        }
        if (scopes.has(ShareScope.ALLERGIES)) {
          entry.allergies = await Allergy.findAll({ where: { patient_id: sp.id }, order: [['createdAt', 'DESC']] });
        }
        if (scopes.has(ShareScope.MEDICATIONS)) {
          entry.medications = await Medication.findAll({ where: { patient_id: sp.id }, order: [['createdAt', 'DESC']] });
        }
        if (scopes.has(ShareScope.CLINICAL_NOTES)) {
          entry.clinical_notes = await ClinicalNote.findAll({ where: { patient_id: sp.id }, order: [['createdAt', 'DESC']], limit: 100 });
        }
        if (scopes.has(ShareScope.LAB_RESULTS)) {
          const orders = await TestOrder.findAll({ where: { patient_id: sp.id }, order: [['createdAt', 'DESC']], limit: 100 });
          const orderIds = orders.map(o => o.id);
          const results = orderIds.length
            ? await TestResult.findAll({ where: { test_order_id: { [Op.in]: orderIds } } })
            : [];
          entry.lab_results = { orders, results };
        }
        sources.push(entry);
      }
    }

    // Audit every external access — this is the audit-critical path.
    await AuditLog.create({
      tenant_id: recipientTenantId,
      user_id: actorUserId || null,
      action: AuditAction.ACCESS,
      resource: 'patient.external_records',
      resource_id: patient.id,
      new_values: { person_id: patient.person_id, source_tenants: Object.keys(scopesBySource), grant_count: grants.length }
    } as any).catch(() => { /* best-effort */ });

    return { person_id: patient.person_id, source_count: sources.length, sources };
  }
};
