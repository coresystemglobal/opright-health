import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const NOTIFICATION_TYPES = [
  'appointment_reminder', 'appointment_booked', 'appointment_cancelled', 'appointment_rescheduled',
  'lab_result', 'prescription_ready', 'emergency', 'system_alert', 'payment_status'
];

const channelPrefs = Joi.object({
  in_app: Joi.boolean().optional(),
  push: Joi.boolean().optional(),
  email: Joi.boolean().optional(),
  sms: Joi.boolean().optional()
});

export const notificationValidation = {
  send: Joi.object({
    user_id: commonSchemas.optionalUuid,
    type: Joi.string().valid(...NOTIFICATION_TYPES).required(),
    title: Joi.string().max(200).trim().required(),
    message: Joi.string().max(2000).trim().required(),
    data: Joi.object().optional(),
    channels: Joi.array().items(Joi.string().valid('in_app', 'push', 'email', 'sms')).optional()
  }),

  list: Joi.object({
    unread: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  registerDevice: Joi.object({
    platform: Joi.string().valid('fcm', 'web').required(),
    token: Joi.string().max(2000).required(),
    subscription: Joi.object().optional(),
    device_label: Joi.string().max(300).optional()
  }),

  unregisterDevice: Joi.object({
    token: Joi.string().max(2000).required()
  }),

  updatePreferences: Joi.object({
    channels: channelPrefs.optional(),
    overrides: Joi.object().pattern(Joi.string().valid(...NOTIFICATION_TYPES), channelPrefs).optional()
  }).min(1)
};
