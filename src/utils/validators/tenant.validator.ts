import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const tenantValidation = {
  create: Joi.object({
    name: Joi.string().max(200).required(),
    subdomain: Joi.string().alphanum().min(3).max(100).required(),
    contact_email: commonSchemas.email.required(),
    contact_phone: commonSchemas.phone.required(),
    address: commonSchemas.longText.optional(),
    facility_type: Joi.string().valid('hospital', 'laboratory', 'pharmacy', 'clinic', 'diagnostic_center', 'other').optional()
  }),

  reminderSettings: Joi.object({
    enabled: Joi.boolean().optional(),
    long_lead_hours: Joi.number().integer().min(1).max(168).optional(),  // up to 1 week
    short_lead_hours: Joi.number().integer().min(1).max(48).optional()
  }).min(1)
};
