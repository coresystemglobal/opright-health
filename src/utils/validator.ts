import Joi from 'joi';
import { UserRole } from '../models/user.model';
import { Gender } from '../models/patient.model';
import { AppointmentStatus, AppointmentType, Priority } from '../models/appointment.model';
import { 
  TestCategory, 
  SpecimenType, 
  TestOrderStatus, 
  TestUrgency, 
  TestResultStatus 
} from '../types/laboratory.types';

// Common validation schemas
const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  optionalUuid: Joi.string().uuid().optional(),
  email: Joi.string().email().lowercase().trim().max(255),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).trim(),
  name: Joi.string().pattern(/^[a-zA-Z\s\-']{2,100}$/).trim(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  date: Joi.date().iso(),
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  mrn: Joi.string().pattern(/^PAT\d{9}$/),
  amount: Joi.number().positive().max(5000000).precision(2),
  text: Joi.string().max(1000).trim(),
  longText: Joi.string().max(5000).trim()
};

// User validation schemas
export const userValidation = {
  register: Joi.object({
    first_name: commonSchemas.name.required(),
    last_name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    username: Joi.string().alphanum().min(3).max(30).trim().optional(),
    password: commonSchemas.password.required(),
    phone: commonSchemas.phone.optional(),
    role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.PATIENT)
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  update: Joi.object({
    first_name: commonSchemas.name.optional(),
    last_name: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    username: Joi.string().alphanum().min(3).max(30).trim().optional()
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: commonSchemas.password.required()
  }),

  resetPassword: Joi.object({
    email: commonSchemas.email.required()
  })
};

// Patient validation schemas
export const patientValidation = {
  create: Joi.object({
    first_name: commonSchemas.name.required(),
    last_name: commonSchemas.name.required(),
    date_of_birth: commonSchemas.date.required(),
    gender: Joi.string().valid(...Object.values(Gender)).optional(),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    address: commonSchemas.longText.optional(),
    emergency_contact_name: commonSchemas.name.optional(),
    emergency_contact_phone: commonSchemas.phone.optional()
  }),

  update: Joi.object({
    first_name: commonSchemas.name.optional(),
    last_name: commonSchemas.name.optional(),
    date_of_birth: commonSchemas.date.optional(),
    gender: Joi.string().valid(...Object.values(Gender)).optional(),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    address: commonSchemas.longText.optional(),
    emergency_contact_name: commonSchemas.name.optional(),
    emergency_contact_phone: commonSchemas.phone.optional()
  }),

  search: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    mrn: commonSchemas.mrn.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// Appointment validation schemas
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

// Payment validation schemas
export const paymentValidation = {
  initiate: Joi.object({
    amount: commonSchemas.amount.required(),
    email: commonSchemas.email.required(),
    currency: Joi.string().valid('NGN', 'USD', 'GBP', 'EUR').default('NGN'),
    payment_provider: Joi.string().valid('stripe', 'paystack', 'flutterwave').required(),
    payment_method: Joi.string().valid('credit_card', 'bank_transfer', 'ussd', 'mobile_money').required(),
    invoice_id: commonSchemas.optionalUuid,
    appointment_id: commonSchemas.optionalUuid
  }),

  verify: Joi.object({
    reference: Joi.string().alphanum().min(10).max(100).required()
  }),

  refund: Joi.object({
    amount: commonSchemas.amount.optional(),
    reason: Joi.string().max(500).trim().optional()
  })
};

// Invoice validation schemas
export const invoiceValidation = {
  create: Joi.object({
    patient_id: commonSchemas.uuid,
    appointment_id: commonSchemas.optionalUuid,
    items: Joi.array().items(
      Joi.object({
        description: Joi.string().max(255).required(),
        quantity: Joi.number().integer().min(1).required(),
        unit_price: commonSchemas.amount.required(),
        total: commonSchemas.amount.required()
      })
    ).min(1).required(),
    subtotal: commonSchemas.amount.required(),
    tax_rate: Joi.number().min(0).max(1).precision(4).default(0),
    tax_amount: commonSchemas.amount.default(0),
    total_amount: commonSchemas.amount.required(),
    due_date: commonSchemas.date.optional(),
    notes: commonSchemas.text.optional()
  }),

  update: Joi.object({
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
    notes: commonSchemas.text.optional()
  }),

  search: Joi.object({
    patient_id: commonSchemas.optionalUuid,
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
    date_from: commonSchemas.date.optional(),
    date_to: commonSchemas.date.optional(),
    amount_min: commonSchemas.amount.optional(),
    amount_max: commonSchemas.amount.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// Report validation schemas
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

// Laboratory validation schemas
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

// Generic validation schemas
export const genericValidation = {
  id: Joi.object({
    id: commonSchemas.uuid
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sort_by: Joi.string().max(50).optional()
  }),

  search: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    req.body = value;
    next();
  };
};

// Query validation middleware factory
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }

    req.query = value;
    next();
  };
};

// Params validation middleware factory
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors
      });
    }

    req.params = value;
    next();
  };
};

// Sanitization helper
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};