import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const PROVIDERS = ['daily_co', 'jitsi', 'twilio', 'webrtc', 'external'];
const STATUSES = ['scheduled', 'active', 'completed', 'cancelled'];

export const telemedicineValidation = {
  create: Joi.object({
    appointment_id: commonSchemas.optionalUuid,
    doctor_id: commonSchemas.uuid,
    patient_id: commonSchemas.uuid,
    provider: Joi.string().valid(...PROVIDERS).default('webrtc'),
    scheduled_at: commonSchemas.date.optional(),
    notes: Joi.string().max(5000).trim().optional()
  }),
  list: Joi.object({
    doctor_id: commonSchemas.optionalUuid,
    patient_id: commonSchemas.optionalUuid,
    status: Joi.string().valid(...STATUSES).optional(),
    appointment_id: commonSchemas.optionalUuid,
    from: commonSchemas.date.optional(),
    to: commonSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  end: Joi.object({
    recording_url: Joi.string().uri().max(500).optional(),
    notes: Joi.string().max(5000).trim().optional()
  }),
  cancel: Joi.object({
    reason: Joi.string().max(500).trim().optional()
  })
};
