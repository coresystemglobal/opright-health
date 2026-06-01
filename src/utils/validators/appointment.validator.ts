import Joi from 'joi';
import { AppointmentStatus, AppointmentType, Priority } from '@modules/appointments/appointment.model';
import { commonSchemas } from './common.schemas';

export const appointmentValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    doctor_id: commonSchemas.uuid,
    appointment_date: commonSchemas.date.required(),
    appointment_time: commonSchemas.time.required(),
    duration_minutes: Joi.number().integer().min(15).max(480).default(30),
    appointment_type: Joi.string().valid(...Object.values(AppointmentType)).required(),
    priority: Joi.string().valid(...Object.values(Priority)).default(Priority.NORMAL),
    notes: commonSchemas.text.optional(),
    chief_complaint: commonSchemas.text.optional(),
    consultation_fee: commonSchemas.amount.optional()
  }),

  update: Joi.object({
    appointment_date: commonSchemas.date.optional(),
    appointment_time: commonSchemas.time.optional(),
    duration_minutes: Joi.number().integer().min(15).max(480).optional(),
    status: Joi.string().valid(...Object.values(AppointmentStatus)).optional(),
    notes: commonSchemas.text.optional(),
    chief_complaint: commonSchemas.text.optional(),
    diagnosis: commonSchemas.longText.optional(),
    treatment_plan: commonSchemas.longText.optional(),
    prescription: commonSchemas.longText.optional()
  }),

  search: Joi.object({
    patient_id: commonSchemas.optionalUuid,
    doctor_id: commonSchemas.optionalUuid,
    date_from: commonSchemas.date.optional(),
    date_to: commonSchemas.date.optional(),
    status: Joi.string().valid(...Object.values(AppointmentStatus)).optional(),
    appointment_type: Joi.string().valid(...Object.values(AppointmentType)).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};
