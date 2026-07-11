import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const WARD_TYPES = ['general', 'icu', 'maternity', 'pediatric', 'surgical', 'isolation', 'emergency', 'psychiatric', 'other'];
const GENDER = ['male', 'female', 'mixed'];
const BED_TYPES = ['standard', 'icu', 'pediatric', 'maternity', 'bariatric'];
const BED_STATUSES = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'];
// Statuses an operator may set directly (occupancy is admission-driven)
const MANUAL_BED_STATUSES = ['available', 'reserved', 'cleaning', 'maintenance', 'blocked'];

export const wardValidation = {
  create: Joi.object({
    hospital_id: commonSchemas.uuid,
    department_id: commonSchemas.optionalUuid,
    name: Joi.string().max(150).trim().required(),
    code: Joi.string().max(30).trim().required(),
    ward_type: Joi.string().valid(...WARD_TYPES).default('general'),
    gender_restriction: Joi.string().valid(...GENDER).default('mixed'),
    floor: Joi.string().max(50).trim().optional(),
    description: commonSchemas.longText.optional()
  }),

  update: Joi.object({
    department_id: commonSchemas.optionalUuid,
    name: Joi.string().max(150).trim().optional(),
    code: Joi.string().max(30).trim().optional(),
    ward_type: Joi.string().valid(...WARD_TYPES).optional(),
    gender_restriction: Joi.string().valid(...GENDER).optional(),
    floor: Joi.string().max(50).trim().optional(),
    description: commonSchemas.longText.optional(),
    is_active: Joi.boolean().optional()
  }).min(1),

  list: Joi.object({
    hospital_id: commonSchemas.optionalUuid,
    department_id: commonSchemas.optionalUuid,
    ward_type: Joi.string().valid(...WARD_TYPES).optional(),
    is_active: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

export const bedValidation = {
  create: Joi.object({
    ward_id: commonSchemas.uuid,
    bed_number: Joi.string().max(30).trim().required(),
    bed_type: Joi.string().valid(...BED_TYPES).default('standard'),
    notes: commonSchemas.longText.optional()
  }),

  update: Joi.object({
    bed_number: Joi.string().max(30).trim().optional(),
    bed_type: Joi.string().valid(...BED_TYPES).optional(),
    notes: commonSchemas.longText.optional(),
    is_active: Joi.boolean().optional()
  }).min(1),

  changeStatus: Joi.object({
    status: Joi.string().valid(...MANUAL_BED_STATUSES).required()
  }),

  list: Joi.object({
    status: Joi.string().valid(...BED_STATUSES).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  board: Joi.object({
    hospital_id: commonSchemas.optionalUuid
  })
};

export const admissionValidation = {
  admit: Joi.object({
    patient_id: commonSchemas.uuid,
    ward_id: commonSchemas.uuid,
    bed_id: commonSchemas.uuid,
    admitting_doctor_id: commonSchemas.optionalUuid,
    reason: commonSchemas.longText.optional(),
    expected_discharge_at: commonSchemas.date.optional()
  }),

  transfer: Joi.object({
    bed_id: commonSchemas.uuid
  }),

  discharge: Joi.object({
    notes: commonSchemas.longText.optional()
  }),

  list: Joi.object({
    ward_id: commonSchemas.optionalUuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
