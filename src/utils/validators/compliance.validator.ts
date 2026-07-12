import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const CONSENT_TYPES = ['data_processing', 'marketing', 'research', 'data_sharing', 'sms', 'email'];
const REQUEST_TYPES = ['access', 'erasure', 'rectification'];
const REQUEST_STATUSES = ['pending', 'in_progress', 'completed', 'rejected'];

export const complianceValidation = {
  recordConsent: Joi.object({
    patient_id: commonSchemas.uuid,
    consent_type: Joi.string().valid(...CONSENT_TYPES).required(),
    granted: Joi.boolean().required(),
    consent_version: Joi.string().max(30).trim().optional(),
    notes: commonSchemas.longText.optional()
  }),

  withdrawConsent: Joi.object({
    patient_id: commonSchemas.uuid,
    consent_type: Joi.string().valid(...CONSENT_TYPES).required()
  }),

  createRequest: Joi.object({
    patient_id: commonSchemas.uuid,
    request_type: Joi.string().valid(...REQUEST_TYPES).required(),
    reason: commonSchemas.longText.optional()
  }),

  listRequests: Joi.object({
    status: Joi.string().valid(...REQUEST_STATUSES).optional(),
    request_type: Joi.string().valid(...REQUEST_TYPES).optional(),
    patient_id: commonSchemas.optionalUuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid(...REQUEST_STATUSES).required(),
    result_notes: commonSchemas.longText.optional()
  }),

  retention: Joi.object({
    years: Joi.number().integer().min(1).max(50).default(7)
  })
};
