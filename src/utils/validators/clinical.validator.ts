import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const medicationValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    medication_name: Joi.string().max(200).trim().required(),
    dosage: Joi.string().max(100).trim().required(),
    strength: Joi.string().max(50).trim().optional(),
    route: Joi.string().valid('oral','intravenous','intramuscular','subcutaneous','topical','inhalation','rectal','sublingual','transdermal','other').default('oral'),
    frequency: Joi.string().valid('once_daily','twice_daily','three_times_daily','four_times_daily','every_4_hours','every_6_hours','every_8_hours','every_12_hours','as_needed','weekly','monthly','other').required(),
    instructions: commonSchemas.longText.optional(),
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.optional(),
    reason: commonSchemas.text.optional(),
    side_effects: commonSchemas.longText.optional(),
    notes: commonSchemas.longText.optional(),
    prescribing_doctor_id: commonSchemas.uuid
  }),

  update: Joi.object({
    medication_name: Joi.string().max(200).trim().optional(),
    dosage: Joi.string().max(100).trim().optional(),
    strength: Joi.string().max(50).trim().optional(),
    route: Joi.string().valid('oral','intravenous','intramuscular','subcutaneous','topical','inhalation','rectal','sublingual','transdermal','other').optional(),
    frequency: Joi.string().valid('once_daily','twice_daily','three_times_daily','four_times_daily','every_4_hours','every_6_hours','every_8_hours','every_12_hours','as_needed','weekly','monthly','other').optional(),
    instructions: commonSchemas.longText.optional(),
    end_date: commonSchemas.date.optional(),
    is_active: Joi.boolean().optional(),
    reason: commonSchemas.text.optional(),
    side_effects: commonSchemas.longText.optional(),
    notes: commonSchemas.longText.optional()
  }),

  search: Joi.object({
    patient_id: commonSchemas.optionalUuid,
    is_active: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
