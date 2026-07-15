import Joi from 'joi';

export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  optionalUuid: Joi.string().uuid().optional(),
  email: Joi.string().email().lowercase().trim().max(255),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).trim(),
  name: Joi.string().pattern(/^[a-zA-Z\s\-']{2,100}$/).trim(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  date: Joi.date().iso(),
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  mrn: Joi.string().pattern(/^PAT\d{6}$/),
  amount: Joi.number().positive().max(5000000).precision(2),
  text: Joi.string().max(1000).trim(),
  longText: Joi.string().max(5000).trim()
};
