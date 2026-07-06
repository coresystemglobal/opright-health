import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const auditValidation = {
  search: Joi.object({
    userId: commonSchemas.optionalUuid,
    resource: Joi.string().max(100).optional(),
    action: Joi.string().valid('create', 'update', 'delete', 'login', 'logout', 'access', 'export').optional(),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  })
};
