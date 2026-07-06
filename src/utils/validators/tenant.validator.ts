import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const tenantValidation = {
  create: Joi.object({
    name: Joi.string().max(200).required(),
    subdomain: Joi.string().alphanum().min(3).max(100).required(),
    contact_email: commonSchemas.email.required(),
    contact_phone: commonSchemas.phone.required(),
    address: commonSchemas.longText.optional()
  })
};
