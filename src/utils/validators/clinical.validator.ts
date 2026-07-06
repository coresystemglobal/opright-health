import Joi from 'joi';
import { commonSchemas } from './common.schemas';

export const medicationValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    medication_name: Joi.string().max(200).trim().required(),
    dosage: Joi.string().max(100).trim().required(),
    strength: Joi.string().max(50).trim().optional(),
    route: Joi.string().valid('oral','intravenous','intramuscular','subcutaneous','topical','inhalation','rectal','sublingual','transdermal','other').default('oral'),
    frequency: Joi.string().valid('once_daily','twice_daily','three_times_daily','four_times_daily','every_4_hours','every_6_hours','every_8_hours','every_12_hours','as_needed','weekly','monthly','other').required(),
    instructions: commonSchemas.longText.optional(),
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.optional(),
    reason: commonSchemas.text.optional(),
    side_effects: commonSchemas.longText.optional(),
    notes: commonSchemas.longText.optional(),
    prescribing_doctor_id: commonSchemas.uuid
  }),

  update: Joi.object({
    medication_name: Joi.string().max(200).trim().optional(),
    dosage: Joi.string().max(100).trim().optional(),
    strength: Joi.string().max(50).trim().optional(),
    route: Joi.string().valid('oral','intravenous','intramuscular','subcutaneous','topical','inhalation','rectal','sublingual','transdermal','other').optional(),
    frequency: Joi.string().valid('once_daily','twice_daily','three_times_daily','four_times_daily','every_4_hours','every_6_hours','every_8_hours','every_12_hours','as_needed','weekly','monthly','other').optional(),
    instructions: commonSchemas.longText.optional(),
    end_date: commonSchemas.date.optional(),
    is_active: Joi.boolean().optional(),
    reason: commonSchemas.text.optional(),
    side_effects: commonSchemas.longText.optional(),
    notes: commonSchemas.longText.optional()
  }),

  search: Joi.object({
    patient_id: commonSchemas.optionalUuid,
    is_active: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

const NOTE_TYPES = ['soap', 'progress', 'consultation', 'admission', 'discharge', 'procedure', 'follow_up', 'other'];

const soapNoteSchema = Joi.object({
  subjective: commonSchemas.longText.optional(),
  objective: commonSchemas.longText.optional(),
  assessment: commonSchemas.longText.optional(),
  plan: commonSchemas.longText.optional()
});

export const clinicalNoteValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    appointment_id: commonSchemas.optionalUuid,
    doctor_id: commonSchemas.uuid,
    note_type: Joi.string().valid(...NOTE_TYPES).default('progress'),
    title: Joi.string().max(200).trim().optional(),
    chief_complaint: commonSchemas.longText.optional(),
    soap_note: soapNoteSchema.optional(),
    content: commonSchemas.longText.optional(),
    diagnosis: commonSchemas.longText.optional(),
    treatment_plan: commonSchemas.longText.optional(),
    prescriptions: commonSchemas.longText.optional(),
    follow_up_instructions: commonSchemas.longText.optional(),
    follow_up_date: commonSchemas.date.optional(),
    note_date: commonSchemas.date.optional()
  }),

  update: Joi.object({
    note_type: Joi.string().valid(...NOTE_TYPES).optional(),
    title: Joi.string().max(200).trim().optional(),
    chief_complaint: commonSchemas.longText.optional(),
    soap_note: soapNoteSchema.optional(),
    content: commonSchemas.longText.optional(),
    diagnosis: commonSchemas.longText.optional(),
    treatment_plan: commonSchemas.longText.optional(),
    prescriptions: commonSchemas.longText.optional(),
    follow_up_instructions: commonSchemas.longText.optional(),
    follow_up_date: commonSchemas.date.optional()
  }).min(1),

  search: Joi.object({
    note_type: Joi.string().valid(...NOTE_TYPES).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

const TREND_METRICS = ['temperature', 'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'respiratory_rate', 'oxygen_saturation', 'weight', 'bmi', 'blood_glucose'];

export const vitalSignValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    appointment_id: commonSchemas.optionalUuid,
    temperature: Joi.number().min(80).max(115).optional(),          // °F
    heart_rate: Joi.number().integer().min(20).max(300).optional(), // bpm
    blood_pressure_systolic: Joi.number().integer().min(40).max(300).optional(),
    blood_pressure_diastolic: Joi.number().integer().min(20).max(200).optional(),
    respiratory_rate: Joi.number().integer().min(4).max(80).optional(),
    oxygen_saturation: Joi.number().integer().min(0).max(100).optional(),
    height: Joi.number().min(20).max(300).optional(),               // cm
    weight: Joi.number().min(0.5).max(700).optional(),              // kg
    blood_glucose: Joi.number().min(10).max(1000).optional(),       // mg/dL
    notes: commonSchemas.longText.optional(),
    recorded_at: commonSchemas.date.optional()
  }).min(2), // patient_id plus at least one measurement

  update: Joi.object({
    temperature: Joi.number().min(80).max(115).optional(),
    heart_rate: Joi.number().integer().min(20).max(300).optional(),
    blood_pressure_systolic: Joi.number().integer().min(40).max(300).optional(),
    blood_pressure_diastolic: Joi.number().integer().min(20).max(200).optional(),
    respiratory_rate: Joi.number().integer().min(4).max(80).optional(),
    oxygen_saturation: Joi.number().integer().min(0).max(100).optional(),
    height: Joi.number().min(20).max(300).optional(),
    weight: Joi.number().min(0.5).max(700).optional(),
    blood_glucose: Joi.number().min(10).max(1000).optional(),
    notes: commonSchemas.longText.optional()
  }).min(1),

  search: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  trends: Joi.object({
    // comma-separated list validated against TREND_METRICS in the service
    metrics: Joi.string().max(200).optional(),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional()
  })
};
