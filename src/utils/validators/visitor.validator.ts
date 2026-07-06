import Joi from 'joi';
import { VisitPurpose, VisitorIdType } from '@modules/visitors/visitor-log.model';
import { commonSchemas } from './common.schemas';

export const visitorValidation = {
  checkIn: Joi.object({
    visitor_name: commonSchemas.name.required(),
    visitor_phone: commonSchemas.phone.required(),
    id_type: Joi.string().valid(...Object.values(VisitorIdType)).optional(),
    id_number: Joi.string().max(50).trim().optional(),
    host_name: Joi.string().max(100).trim().required(),
    patient_id: commonSchemas.optionalUuid,
    purpose: Joi.string().valid(...Object.values(VisitPurpose)).optional(),
    ward_or_location: Joi.string().max(100).trim().optional(),
    badge_number: Joi.string().max(20).trim().optional(),
    notes: commonSchemas.text.optional()
  }),

  lookup: Joi.object({
    phone: commonSchemas.phone.required()
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('checked_in', 'checked_out').optional(),
    q: Joi.string().max(100).trim().optional()
  })
};
