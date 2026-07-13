import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const DEVICE_TYPES = ['vital_monitor', 'glucose_meter', 'blood_pressure_monitor', 'thermometer', 'pulse_oximeter', 'ecg_monitor', 'weight_scale', 'wearable', 'other'];
const DEVICE_STATUSES = ['active', 'inactive', 'maintenance', 'decommissioned'];

// { metric: { min?, max? } }
const thresholdsSchema = Joi.object().pattern(
  Joi.string().max(60),
  Joi.object({ min: Joi.number().optional(), max: Joi.number().optional() }).min(1)
);

export const iotValidation = {
  registerDevice: Joi.object({
    external_device_id: Joi.string().max(100).trim().required(),
    name: Joi.string().max(150).trim().required(),
    device_type: Joi.string().valid(...DEVICE_TYPES).default('vital_monitor'),
    location: Joi.string().max(200).trim().optional(),
    status: Joi.string().valid(...DEVICE_STATUSES).default('active'),
    thresholds: thresholdsSchema.optional(),
    assigned_patient_id: commonSchemas.optionalUuid
  }),
  updateDevice: Joi.object({
    name: Joi.string().max(150).trim().optional(),
    device_type: Joi.string().valid(...DEVICE_TYPES).optional(),
    location: Joi.string().max(200).trim().optional().allow(null),
    status: Joi.string().valid(...DEVICE_STATUSES).optional(),
    thresholds: thresholdsSchema.optional().allow(null),
    assigned_patient_id: commonSchemas.optionalUuid.allow(null)
  }).min(1),
  listDevices: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    device_type: Joi.string().valid(...DEVICE_TYPES).optional(),
    status: Joi.string().valid(...DEVICE_STATUSES).optional(),
    assigned_patient_id: commonSchemas.optionalUuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  ingestReading: Joi.object({
    metrics: Joi.object().pattern(Joi.string().max(60), Joi.any()).min(1).required(),
    patient_id: commonSchemas.optionalUuid,
    recorded_at: commonSchemas.date.optional()
  }),
  listReadings: Joi.object({
    device_id: commonSchemas.optionalUuid,
    patient_id: commonSchemas.optionalUuid,
    is_abnormal: Joi.boolean().optional(),
    from: commonSchemas.date.optional(),
    to: commonSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
