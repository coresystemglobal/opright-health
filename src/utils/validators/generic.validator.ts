import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const genericValidation = {
  id: Joi.object({
    id: commonSchemas.uuid
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
