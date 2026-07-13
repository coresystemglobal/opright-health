import Joi from 'joi';
import { AppointmentStatus, AppointmentType } from '@modules/appointments/appointment.model';
import { commonSchemas } from './common.schemas';

export const reportValidation = {
  dateRange: Joi.object({
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.required(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  }),

  revenue: Joi.object({
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.required(),
    group_by: Joi.string().valid('day', 'week', 'month').default('day'),
    payment_provider: Joi.string().valid('stripe', 'paystack', 'flutterwave').optional()
  }),

  appointments: Joi.object({
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.required(),
    doctor_id: commonSchemas.optionalUuid,
    status: Joi.string().valid(...Object.values(AppointmentStatus)).optional(),
    appointment_type: Joi.string().valid(...Object.values(AppointmentType)).optional()
  })
};

const REPORT_TYPES = ['digest', 'financial', 'operational-metrics', 'trends', 'inventory-valuation', 'patient-demographics', 'doctor-performance', 'appointment-analytics'];
const FORMATS = ['html', 'csv', 'xlsx', 'pdf'];
const FREQUENCIES = ['daily', 'weekly', 'monthly'];

export const reportScheduleValidation = {
  create: Joi.object({
    name: Joi.string().max(150).trim().required(),
    report_type: Joi.string().valid(...REPORT_TYPES).required(),
    format: Joi.string().valid(...FORMATS).default('html'),
    frequency: Joi.string().valid(...FREQUENCIES).default('weekly'),
    recipients: Joi.array().items(commonSchemas.email).optional(),
    params: Joi.object({
      metric: Joi.string().valid('revenue', 'patients', 'appointments').optional(),
      period: Joi.string().valid('daily', 'weekly', 'monthly').optional()
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().max(150).trim().optional(),
    report_type: Joi.string().valid(...REPORT_TYPES).optional(),
    format: Joi.string().valid(...FORMATS).optional(),
    frequency: Joi.string().valid(...FREQUENCIES).optional(),
    recipients: Joi.array().items(commonSchemas.email).optional(),
    params: Joi.object({
      metric: Joi.string().valid('revenue', 'patients', 'appointments').optional(),
      period: Joi.string().valid('daily', 'weekly', 'monthly').optional()
    }).optional(),
    is_active: Joi.boolean().optional()
  }).min(1)
};
