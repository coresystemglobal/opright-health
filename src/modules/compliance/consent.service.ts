import { ConsentRecord } from '../../models';
import { ConsentType } from '@modules/compliance/consent.model';
import { ValidationUtil } from '@utils/validation.util';

interface RecordConsentData {
  patient_id: string;
  consent_type: ConsentType;
  granted: boolean;
  consent_version?: string;
  notes?: string;
  tenant_id: string;
}

/**
 * Consent is stored append-only: each grant/withdrawal is a new row, so the
 * full history is auditable. The latest row per (patient, type) is current.
 */
export const consentService = {
  recordConsent: async (data: RecordConsentData) => {
    const { patient_id, consent_type, tenant_id } = data;
    if (!patient_id || !consent_type || !tenant_id) throw new Error('patient_id, consent_type, and tenant context are required');
    if (!ValidationUtil.isValidUUID(patient_id)) throw new Error('Invalid patient ID format');

    return ConsentRecord.create({
      patient_id,
      consent_type,
      granted: data.granted,
      granted_at: data.granted ? new Date() : null,
      withdrawn_at: data.granted ? null : new Date(),
      consent_version: data.consent_version || null,
      notes: data.notes || null,
      tenant_id
    } as any);
  },

  withdrawConsent: async (patientId: string, consentType: ConsentType, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    return ConsentRecord.create({
      patient_id: patientId,
      consent_type: consentType,
      granted: false,
      withdrawn_at: new Date(),
      tenant_id: tenantId
    } as any);
  },

  /** Full history plus the current (latest) decision per consent type. */
  getPatientConsents: async (patientId: string) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    const history = await ConsentRecord.findAll({
      where: { patient_id: patientId },
      order: [['createdAt', 'DESC']]
    });

    const current: Record<string, boolean> = {};
    for (const rec of history) {
      // history is newest-first, so first seen per type is the current state
      if (!(rec.consent_type in current)) current[rec.consent_type] = rec.granted;
    }

    return { patient_id: patientId, current, history };
  }
};
