import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'];
const UNITS = ['unit', 'tablet', 'capsule', 'ml', 'vial', 'ampoule', 'sachet', 'bottle', 'tube', 'other'];
const MOVEMENT_TYPES = ['receipt', 'dispense', 'adjustment', 'wastage', 'return'];

export const pharmacyValidation = {
  createItem: Joi.object({
    name: Joi.string().max(200).trim().required(),
    generic_name: Joi.string().max(200).trim().optional(),
    sku: Joi.string().max(50).trim().required(),
    form: Joi.string().valid(...FORMS).default('tablet'),
    strength: Joi.string().max(50).trim().optional(),
    category: Joi.string().max(100).trim().optional(),
    unit: Joi.string().valid(...UNITS).default('unit'),
    unit_price: Joi.number().min(0).precision(2).default(0),
    reorder_level: Joi.number().integer().min(0).default(0)
  }),

  updateItem: Joi.object({
    name: Joi.string().max(200).trim().optional(),
    generic_name: Joi.string().max(200).trim().optional(),
    sku: Joi.string().max(50).trim().optional(),
    form: Joi.string().valid(...FORMS).optional(),
    strength: Joi.string().max(50).trim().optional(),
    category: Joi.string().max(100).trim().optional(),
    unit: Joi.string().valid(...UNITS).optional(),
    unit_price: Joi.number().min(0).precision(2).optional(),
    reorder_level: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional()
  }).min(1),

  listItems: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    category: Joi.string().max(100).trim().optional(),
    is_active: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  receive: Joi.object({
    batch_number: Joi.string().max(60).trim().required(),
    quantity: Joi.number().integer().min(1).required(),
    expiry_date: Joi.date().iso().optional(),
    cost_price: Joi.number().min(0).precision(2).optional(),
    supplier: Joi.string().max(200).trim().optional()
  }),

  dispense: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
    reference_type: Joi.string().max(40).trim().optional(),
    reference_id: commonSchemas.optionalUuid,
    reason: Joi.string().max(500).trim().optional()
  }),

  adjust: Joi.object({
    delta: Joi.number().integer().invalid(0).required(),
    reason: Joi.string().max(500).trim().required()
  }),

  expiring: Joi.object({
    days: Joi.number().integer().min(0).max(3650).default(30)
  }),

  movements: Joi.object({
    item_id: commonSchemas.optionalUuid,
    movement_type: Joi.string().valid(...MOVEMENT_TYPES).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
