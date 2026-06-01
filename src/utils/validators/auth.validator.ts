import Joi from 'joi';
import { UserRole } from '@modules/users/user.model';
import { commonSchemas } from './common.schemas';

export const userValidation = {
  register: Joi.object({
    first_name: commonSchemas.name.required(),
    last_name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    username: Joi.string().alphanum().min(3).max(30).trim().optional(),
    password: commonSchemas.password.required(),
    phone: commonSchemas.phone.optional(),
    role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.PATIENT)
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  update: Joi.object({
    first_name: commonSchemas.name.optional(),
    last_name: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    username: Joi.string().alphanum().min(3).max(30).trim().optional()
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: commonSchemas.password.required()
  }),

  resetPassword: Joi.object({
    email: commonSchemas.email.required()
  })
};
