import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const PROVIDER_TYPES = ['hmo', 'private_insurer', 'government', 'corporate', 'other'];
const RELATIONSHIPS = ['self', 'spouse', 'child', 'other'];
const POLICY_STATUSES = ['active', 'inactive', 'expired'];
const CLAIM_TYPES = ['claim', 'preauthorization'];
const CLAIM_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled'];

export const insuranceValidation = {
  // Providers
  createProvider: Joi.object({
    name: Joi.string().max(200).trim().required(),
    code: Joi.string().max(30).trim().required(),
    provider_type: Joi.string().valid(...PROVIDER_TYPES).default('hmo'),
    contact_email: commonSchemas.email.optional(),
    contact_phone: commonSchemas.phone.optional(),
    address: commonSchemas.longText.optional()
  }),
  updateProvider: Joi.object({
    name: Joi.string().max(200).trim().optional(),
    code: Joi.string().max(30).trim().optional(),
    provider_type: Joi.string().valid(...PROVIDER_TYPES).optional(),
    contact_email: commonSchemas.email.optional(),
    contact_phone: commonSchemas.phone.optional(),
    address: commonSchemas.longText.optional(),
    is_active: Joi.boolean().optional()
  }).min(1),
  listProviders: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    is_active: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Policies
  createPolicy: Joi.object({
    patient_id: commonSchemas.uuid,
    insurance_provider_id: commonSchemas.uuid,
    policy_number: Joi.string().max(60).trim().required(),
    plan_name: Joi.string().max(150).trim().optional(),
    coverage_percentage: Joi.number().integer().min(0).max(100).default(0),
    holder_name: Joi.string().max(150).trim().optional(),
    relationship: Joi.string().valid(...RELATIONSHIPS).default('self'),
    valid_from: Joi.date().iso().optional(),
    valid_to: Joi.date().iso().optional(),
    is_primary: Joi.boolean().default(false)
  }),
  updatePolicy: Joi.object({
    policy_number: Joi.string().max(60).trim().optional(),
    plan_name: Joi.string().max(150).trim().optional(),
    coverage_percentage: Joi.number().integer().min(0).max(100).optional(),
    holder_name: Joi.string().max(150).trim().optional(),
    relationship: Joi.string().valid(...RELATIONSHIPS).optional(),
    valid_from: Joi.date().iso().optional(),
    valid_to: Joi.date().iso().optional(),
    is_primary: Joi.boolean().optional(),
    status: Joi.string().valid(...POLICY_STATUSES).optional()
  }).min(1),

  // Claims
  estimate: Joi.object({
    amount: Joi.number().positive().required(),
    policy_id: commonSchemas.optionalUuid,
    coverage_percentage: Joi.number().integer().min(0).max(100).optional()
  }).or('policy_id', 'coverage_percentage'),

  createClaim: Joi.object({
    claim_type: Joi.string().valid(...CLAIM_TYPES).default('claim'),
    patient_id: commonSchemas.uuid,
    insurance_provider_id: commonSchemas.uuid,
    policy_id: commonSchemas.optionalUuid,
    invoice_id: commonSchemas.optionalUuid,
    service_date: Joi.date().iso().optional(),
    claimed_amount: Joi.number().positive().required(),
    diagnosis: commonSchemas.longText.optional(),
    notes: commonSchemas.longText.optional()
  }),
  listClaims: Joi.object({
    status: Joi.string().valid(...CLAIM_STATUSES).optional(),
    patient_id: commonSchemas.optionalUuid,
    insurance_provider_id: commonSchemas.optionalUuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  decision: Joi.object({
    decision: Joi.string().valid('approve', 'reject').required(),
    approved_amount: Joi.number().positive().when('decision', { is: 'approve', then: Joi.required() }),
    rejection_reason: Joi.string().max(1000).trim().when('decision', { is: 'reject', then: Joi.required() }),
    authorization_code: Joi.string().max(80).trim().optional()
  }),
  cancel: Joi.object({
    reason: Joi.string().max(1000).trim().optional()
  })
};
