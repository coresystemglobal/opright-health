import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const genericValidation = {
  id: Joi.object({
    id: commonSchemas.uuid
  }),

  // Param schemas keyed to their actual route param name. `validateParams`
  // strips unknown keys, so validating `id` on a route whose param is
  // `:patientId`/`:orderId` drops the value and 400s ("id is required").
  patientId: Joi.object({
    patientId: commonSchemas.uuid
  }),

  orderId: Joi.object({
    orderId: commonSchemas.uuid
  }),

  doctorId: Joi.object({
    doctorId: commonSchemas.uuid
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sort_by: Joi.string().max(50).optional()
  }),

  search: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
