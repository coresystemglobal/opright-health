import Joi from 'joi';
import { Gender } from '@modules/patients/patient.model';
import { commonSchemas } from './common.schemas';

export const patientValidation = {
  create: Joi.object({
    first_name: commonSchemas.name.required(),
    last_name: commonSchemas.name.required(),
    date_of_birth: commonSchemas.date.required(),
    gender: Joi.string().valid(...Object.values(Gender)).optional(),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    address: commonSchemas.longText.optional(),
    emergency_contact_name: commonSchemas.name.optional(),
    emergency_contact_phone: commonSchemas.phone.optional()
  }),

  update: Joi.object({
    first_name: commonSchemas.name.optional(),
    last_name: commonSchemas.name.optional(),
    date_of_birth: commonSchemas.date.optional(),
    gender: Joi.string().valid(...Object.values(Gender)).optional(),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    address: commonSchemas.longText.optional(),
    emergency_contact_name: commonSchemas.name.optional(),
    emergency_contact_phone: commonSchemas.phone.optional()
  }),

  search: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    mrn: commonSchemas.mrn.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
