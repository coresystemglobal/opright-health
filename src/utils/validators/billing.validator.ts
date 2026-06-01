import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const paymentValidation = {
  initiate: Joi.object({
    amount: commonSchemas.amount.required(),
    email: commonSchemas.email.required(),
    currency: Joi.string().valid('NGN', 'USD', 'GBP', 'EUR').default('NGN'),
    payment_provider: Joi.string().valid('stripe', 'paystack', 'flutterwave').default('paystack'),
    payment_method: Joi.string().valid('credit_card', 'bank_transfer', 'ussd', 'mobile_money', 'online').default('online'),
    invoice_id: commonSchemas.optionalUuid,
    appointment_id: commonSchemas.optionalUuid,
    metadata: Joi.object().optional()
  }),

  verify: Joi.object({
    reference: Joi.string().alphanum().min(10).max(100).required()
  }),

  refund: Joi.object({
    amount: commonSchemas.amount.optional(),
    reason: Joi.string().max(500).trim().optional()
  })
};

export const invoiceValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    appointment_id: commonSchemas.optionalUuid,
    items: Joi.array().items(
      Joi.object({
        description: Joi.string().max(255).required(),
        quantity: Joi.number().integer().min(1).required(),
        unit_price: commonSchemas.amount.required(),
        total: commonSchemas.amount.required()
      })
    ).min(1).required(),
    subtotal: commonSchemas.amount.required(),
    tax_rate: Joi.number().min(0).max(1).precision(4).default(0),
    tax_amount: commonSchemas.amount.default(0),
    total_amount: commonSchemas.amount.required(),
    due_date: commonSchemas.date.optional(),
    notes: commonSchemas.text.optional()
  }),

  update: Joi.object({
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
    notes: commonSchemas.text.optional()
  }),

  search: Joi.object({
    patient_id: commonSchemas.optionalUuid,
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
    date_from: commonSchemas.date.optional(),
    date_to: commonSchemas.date.optional(),
    amount_min: commonSchemas.amount.optional(),
    amount_max: commonSchemas.amount.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
