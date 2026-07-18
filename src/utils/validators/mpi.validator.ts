import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const personDraft = Joi.object({
  national_id: Joi.string().max(30).trim().optional(),
  verified_email: commonSchemas.email.optional(),
  verified_phone: Joi.string().max(30).trim().optional(),
  first_name: Joi.string().max(100).trim().optional(),
  middle_name: Joi.string().max(100).trim().optional(),
  last_name: Joi.string().max(100).trim().optional(),
  date_of_birth: commonSchemas.date.optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'unknown').optional()
});

export const mpiValidation = {
  // Link a patient to an existing Person, or mint one from a draft. Exactly one.
  linkPerson: Joi.object({
    person_id: commonSchemas.optionalUuid,
    person_draft: personDraft.optional()
  }).xor('person_id', 'person_draft'),

  personSearch: Joi.object({
    national_id: Joi.string().max(30).trim().optional(),
    last_name: Joi.string().max(100).trim().optional(),
    date_of_birth: commonSchemas.date.optional()
  }).or('national_id', 'last_name', 'date_of_birth'),

  // Grant a cross-tenant record share (source tenant → recipient tenant).
  createShare: Joi.object({
    recipient_tenant_id: commonSchemas.uuid,
    scope: Joi.string().valid('demographics', 'allergies', 'medications', 'lab_results', 'clinical_notes', 'full_record').required(),
    expires_at: commonSchemas.date.optional(),
    consent_signature_id: commonSchemas.optionalUuid
  })
};
