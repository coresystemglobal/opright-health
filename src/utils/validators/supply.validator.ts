import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const SUPPLY_CATEGORIES = ['consumable', 'ppe', 'reagent', 'instrument', 'stationery', 'other'];
const SUPPLY_UNITS = ['unit', 'box', 'pack', 'pair', 'roll', 'bottle', 'litre', 'piece'];
const SUPPLY_MOVEMENT_TYPES = ['receipt', 'issue', 'adjustment', 'wastage', 'return'];
const EQUIPMENT_CATEGORIES = ['diagnostic', 'therapeutic', 'monitoring', 'surgical', 'mobility', 'laboratory', 'it', 'other'];
const EQUIPMENT_STATUSES = ['available', 'in_use', 'under_maintenance', 'retired', 'lost'];

export const supplyValidation = {
  // Supply items
  createItem: Joi.object({
    name: Joi.string().max(200).trim().required(),
    sku: Joi.string().max(50).trim().required(),
    category: Joi.string().valid(...SUPPLY_CATEGORIES).default('consumable'),
    unit: Joi.string().valid(...SUPPLY_UNITS).default('unit'),
    reorder_level: Joi.number().integer().min(0).default(0),
    unit_price: Joi.number().min(0).precision(2).default(0),
    supplier: Joi.string().max(200).trim().optional(),
    description: commonSchemas.longText.optional()
  }),
  updateItem: Joi.object({
    name: Joi.string().max(200).trim().optional(),
    sku: Joi.string().max(50).trim().optional(),
    category: Joi.string().valid(...SUPPLY_CATEGORIES).optional(),
    unit: Joi.string().valid(...SUPPLY_UNITS).optional(),
    reorder_level: Joi.number().integer().min(0).optional(),
    unit_price: Joi.number().min(0).precision(2).optional(),
    supplier: Joi.string().max(200).trim().optional(),
    description: commonSchemas.longText.optional(),
    is_active: Joi.boolean().optional()
  }).min(1),
  listItems: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    category: Joi.string().valid(...SUPPLY_CATEGORIES).optional(),
    is_active: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Stock movements
  receive: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
    reason: Joi.string().max(500).trim().optional()
  }),
  issue: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
    department_id: commonSchemas.optionalUuid,
    reason: Joi.string().max(500).trim().optional()
  }),
  adjust: Joi.object({
    delta: Joi.number().integer().invalid(0).required(),
    reason: Joi.string().max(500).trim().required()
  }),
  wastage: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
    reason: Joi.string().max(500).trim().required()
  }),
  movements: Joi.object({
    item_id: commonSchemas.optionalUuid,
    movement_type: Joi.string().valid(...SUPPLY_MOVEMENT_TYPES).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Equipment
  createEquipment: Joi.object({
    name: Joi.string().max(200).trim().required(),
    asset_code: Joi.string().max(50).trim().required(),
    category: Joi.string().valid(...EQUIPMENT_CATEGORIES).default('other'),
    serial_number: Joi.string().max(100).trim().optional(),
    manufacturer: Joi.string().max(150).trim().optional(),
    model: Joi.string().max(150).trim().optional(),
    location: Joi.string().max(150).trim().optional(),
    department_id: commonSchemas.optionalUuid,
    purchase_date: Joi.date().iso().optional(),
    purchase_cost: Joi.number().min(0).precision(2).optional(),
    warranty_expiry: Joi.date().iso().optional(),
    next_maintenance_at: Joi.date().iso().optional(),
    notes: commonSchemas.longText.optional()
  }),
  updateEquipment: Joi.object({
    name: Joi.string().max(200).trim().optional(),
    asset_code: Joi.string().max(50).trim().optional(),
    category: Joi.string().valid(...EQUIPMENT_CATEGORIES).optional(),
    serial_number: Joi.string().max(100).trim().optional(),
    manufacturer: Joi.string().max(150).trim().optional(),
    model: Joi.string().max(150).trim().optional(),
    location: Joi.string().max(150).trim().optional(),
    department_id: commonSchemas.optionalUuid,
    purchase_date: Joi.date().iso().optional(),
    purchase_cost: Joi.number().min(0).precision(2).optional(),
    warranty_expiry: Joi.date().iso().optional(),
    next_maintenance_at: Joi.date().iso().optional(),
    notes: commonSchemas.longText.optional()
  }).min(1),
  listEquipment: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    category: Joi.string().valid(...EQUIPMENT_CATEGORIES).optional(),
    status: Joi.string().valid(...EQUIPMENT_STATUSES).optional(),
    department_id: commonSchemas.optionalUuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  equipmentStatus: Joi.object({
    status: Joi.string().valid(...EQUIPMENT_STATUSES).required()
  }),
  maintenance: Joi.object({
    next_maintenance_at: Joi.date().iso().optional(),
    notes: commonSchemas.longText.optional(),
    return_to_available: Joi.boolean().optional()
  })
};
