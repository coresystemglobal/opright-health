import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const rbacValidation = {
  createRole: Joi.object({
    role: Joi.string().valid('visitor', 'manager', 'admin', 'security', 'super_admin', 'doctor', 'patient').required(),
    description: commonSchemas.text.optional()
  }),

  assignPermissions: Joi.object({
    permissionIds: Joi.array().items(commonSchemas.uuid).min(1).required()
  }),

  createPermission: Joi.object({
    name: Joi.string().max(100).trim().required(),
    resource: Joi.string().max(50).trim().required(),
    action: Joi.string().max(50).trim().required(),
    description: commonSchemas.text.optional()
  }),

  updatePermission: Joi.object({
    name: Joi.string().max(100).trim().optional(),
    resource: Joi.string().max(50).trim().optional(),
    action: Joi.string().max(50).trim().optional(),
    description: commonSchemas.text.optional()
  }),

  assignRoleToUser: Joi.object({
    userId: commonSchemas.uuid,
    roleId: commonSchemas.uuid
  })
};
