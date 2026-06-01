import Joi from 'joi';
import {
  TestCategory,
  SpecimenType,
  TestOrderStatus,
  TestUrgency,
  TestResultStatus
} from '../../types/laboratory.types';
import { commonSchemas } from './common.schemas';

export const laboratoryValidation = {
  createTest: Joi.object({
    test_code: Joi.string().pattern(/^[A-Z0-9_]{3,20}$/).required(),
    test_name: Joi.string().min(3).max(200).trim().required(),
    description: commonSchemas.longText.optional(),
    category: Joi.string().valid(...Object.values(TestCategory)).required(),
    specimen_type: Joi.string().valid(...Object.values(SpecimenType)).required(),
    price: commonSchemas.amount.required(),
    turnaround_time_hours: Joi.number().integer().min(1).max(168).default(24),
    preparation_instructions: commonSchemas.longText.optional(),
    fasting_required: Joi.boolean().default(false),
    special_requirements: commonSchemas.longText.optional(),
    reference_ranges: Joi.array().items(Joi.object({
      min_value: Joi.number().optional(),
      max_value: Joi.number().optional(),
      text_value: Joi.string().max(100).optional(),
      age_group: Joi.string().max(50).optional(),
      gender: Joi.string().valid('male', 'female', 'both').optional(),
      units: Joi.string().max(20).required(),
      is_critical_low: Joi.boolean().default(false),
      is_critical_high: Joi.boolean().default(false)
    })).optional()
  }),

  updateTest: Joi.object({
    test_name: Joi.string().min(3).max(200).trim().optional(),
    description: commonSchemas.longText.optional(),
    category: Joi.string().valid(...Object.values(TestCategory)).optional(),
    specimen_type: Joi.string().valid(...Object.values(SpecimenType)).optional(),
    price: commonSchemas.amount.optional(),
    turnaround_time_hours: Joi.number().integer().min(1).max(168).optional(),
    preparation_instructions: commonSchemas.longText.optional(),
    fasting_required: Joi.boolean().optional(),
    special_requirements: commonSchemas.longText.optional(),
    reference_ranges: Joi.array().items(Joi.object({
      min_value: Joi.number().optional(),
      max_value: Joi.number().optional(),
      text_value: Joi.string().max(100).optional(),
      age_group: Joi.string().max(50).optional(),
      gender: Joi.string().valid('male', 'female', 'both').optional(),
      units: Joi.string().max(20).required(),
      is_critical_low: Joi.boolean().default(false),
      is_critical_high: Joi.boolean().default(false)
    })).optional(),
    is_active: Joi.boolean().optional()
  }),

  searchTests: Joi.object({
    category: Joi.string().valid(...Object.values(TestCategory)).optional(),
    department: Joi.string().max(50).optional(),
    is_active: Joi.string().valid('true', 'false').default('true'),
    search: Joi.string().max(100).trim().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  createOrder: Joi.object({
    patient_id: commonSchemas.uuid,
    doctor_id: commonSchemas.uuid,
    test_ids: Joi.array().items(commonSchemas.uuid).min(1).required(),
    appointment_id: commonSchemas.optionalUuid,
    urgency: Joi.string().valid(...Object.values(TestUrgency)).default(TestUrgency.ROUTINE),
    clinical_notes: commonSchemas.longText.optional(),
    special_instructions: commonSchemas.longText.optional()
  }),

  searchOrders: Joi.object({
    status: Joi.string().valid(...Object.values(TestOrderStatus)).optional(),
    urgency: Joi.string().valid(...Object.values(TestUrgency)).optional(),
    start_date: commonSchemas.date.optional(),
    end_date: commonSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  collectSpecimen: Joi.object({
    collected_by: commonSchemas.optionalUuid,
    collection_date: commonSchemas.date.default(new Date()),
    collection_notes: commonSchemas.text.optional(),
    specimen_quality: Joi.string().valid('good', 'fair', 'poor').required(),
    rejection_reason: commonSchemas.text.optional()
  }),

  addResults: Joi.object({
    results: Joi.array().items(Joi.object({
      parameter_name: Joi.string().max(200).required(),
      value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
      units: Joi.string().max(50).optional(),
      reference_range: Joi.object({
        min_value: Joi.number().optional(),
        max_value: Joi.number().optional(),
        text_value: Joi.string().max(100).optional(),
        units: Joi.string().max(20).required()
      }).optional(),
      status: Joi.string().valid(...Object.values(TestResultStatus)).default(TestResultStatus.PENDING),
      is_critical: Joi.boolean().default(false),
      notes: commonSchemas.text.optional()
    })).min(1).required(),
    technician_notes: commonSchemas.text.optional(),
    performed_by: commonSchemas.optionalUuid
  }),

  reviewResults: Joi.object({
    reviewer_id: commonSchemas.optionalUuid
  }),

  cancelOrder: Joi.object({
    reason: commonSchemas.text.optional()
  }),

  generateReport: Joi.object({
    start_date: commonSchemas.date.optional(),
    end_date: commonSchemas.date.optional(),
    test_categories: Joi.array().items(Joi.string().valid(...Object.values(TestCategory))).optional(),
    include_normal_results: Joi.boolean().default(false)
  }),

  statisticsQuery: Joi.object({
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.required()
  }),

  workloadQuery: Joi.object({
    start_date: commonSchemas.date.optional(),
    end_date: commonSchemas.date.optional()
  })
};
