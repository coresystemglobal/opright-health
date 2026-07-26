import Joi from 'joi';

const money = Joi.number().min(0).precision(2);
const limit = Joi.number().integer().min(-1); // -1 = unlimited

export const planValidation = {
  create: Joi.object({
    tier: Joi.string().valid('individual', 'basic', 'standard', 'pro').required(),
    name: Joi.string().max(100).trim().required(),
    description: Joi.string().max(1000).trim().optional(),
    price_monthly: money.required(),
    price_yearly: money.required(),
    currency: Joi.string().length(3).uppercase().optional(),
    max_patients: limit.required(),
    max_users: limit.required(),
    max_storage_mb: Joi.number().integer().min(0).required(),
    max_api_calls_per_month: Joi.number().integer().min(0).required(),
    features: Joi.array().items(Joi.string().max(50)).optional(),
    is_active: Joi.boolean().optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    paystack_plan_code_monthly: Joi.string().max(100).optional(),
    paystack_plan_code_yearly: Joi.string().max(100).optional()
  }),

  update: Joi.object({
    name: Joi.string().max(100).trim(),
    description: Joi.string().max(1000).trim().allow(null, ''),
    price_monthly: money,
    price_yearly: money,
    currency: Joi.string().length(3).uppercase(),
    max_patients: limit,
    max_users: limit,
    max_storage_mb: Joi.number().integer().min(0),
    max_api_calls_per_month: Joi.number().integer().min(0),
    features: Joi.array().items(Joi.string().max(50)),
    is_active: Joi.boolean(),
    sort_order: Joi.number().integer().min(0),
    paystack_plan_code_monthly: Joi.string().max(100).allow(null, ''),
    paystack_plan_code_yearly: Joi.string().max(100).allow(null, '')
  }).min(1)
};
