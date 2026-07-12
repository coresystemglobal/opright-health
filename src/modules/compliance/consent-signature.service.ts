import crypto from 'crypto';
import { ConsentSignature, ConsentRecord } from '../../models';
import { SignerRole, SignatureType } from '@modules/compliance/consent-signature.model';
import { ValidationUtil } from '@utils/validation.util';

interface SignData {
  signer_role?: SignerRole;
  signer_name: string;
  signature_type: SignatureType;
  signature_data: string;
  ip_address?: string;
  user_agent?: string;
  tenant_id: string;
}

/**
 * Canonical hash of the consent content being signed. Any later change to
 * these fields makes stored signatures verify as tampered.
 */
function consentDocumentHash(consent: ConsentRecord): string {
  const canonical = JSON.stringify({
    id: consent.id,
    patient_id: consent.patient_id,
    consent_type: consent.consent_type,
    granted: consent.granted,
    consent_version: consent.consent_version || null
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export const consentSignatureService = {
  signConsent: async (consentRecordId: string, data: SignData) => {
    if (!ValidationUtil.isValidUUID(consentRecordId)) throw new Error('Invalid consent record ID format');
    if (!data.signer_name || !data.signature_data) throw new Error('signer_name and signature_data are required');

    const consent = await ConsentRecord.findByPk(consentRecordId);
    if (!consent) throw new Error('Consent record not found');
    if (consent.tenant_id !== data.tenant_id) throw new Error('Consent record does not belong to this tenant');

    return ConsentSignature.create({
      consent_record_id: consentRecordId,
      signer_role: data.signer_role || SignerRole.PATIENT,
      signer_name: data.signer_name,
      signature_type: data.signature_type,
      signature_data: data.signature_data,
      document_hash: consentDocumentHash(consent),
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      signed_at: new Date(),
      tenant_id: data.tenant_id
    } as any);
  },

  getSignatures: async (consentRecordId: string) => {
    if (!ValidationUtil.isValidUUID(consentRecordId)) throw new Error('Invalid consent record ID format');
    return ConsentSignature.findAll({
      where: { consent_record_id: consentRecordId },
      order: [['signed_at', 'ASC']]
    });
  },

  /**
   * Re-derive the consent's current hash and compare it to the one captured
   * at signing. `valid: false` means the consent content changed after it
   * was signed (tamper-evidence).
   */
  verifySignature: async (signatureId: string) => {
    if (!ValidationUtil.isValidUUID(signatureId)) throw new Error('Invalid signature ID format');
    const signature = await ConsentSignature.findByPk(signatureId, { include: [{ model: ConsentRecord, as: 'consent' }] });
    if (!signature) throw new Error('Signature not found');

    const consent = (signature as any).consent as ConsentRecord | undefined;
    if (!consent) {
      return { signature_id: signatureId, valid: false, reason: 'Signed consent record no longer exists' };
    }

    const currentHash = consentDocumentHash(consent);
    const valid = currentHash === signature.document_hash;
    return {
      signature_id: signatureId,
      consent_record_id: signature.consent_record_id,
      signed_at: signature.signed_at,
      valid,
      reason: valid ? undefined : 'Consent content has changed since it was signed'
    };
  }
};
