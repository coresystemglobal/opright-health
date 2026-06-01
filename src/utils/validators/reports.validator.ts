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
