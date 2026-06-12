import Joi from 'joi';

export const commonSchemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }).required(),
  optionalUuid: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  email: Joi.string().email().lowercase().trim().max(255),
  date: Joi.date().iso(),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).message('Time must be in HH:MM or HH:MM:SS format'),
  amount: Joi.number().positive().precision(2),
  text: Joi.string().trim().max(255),
  longText: Joi.string().trim().max(5000)
};
