import Joi from 'joi';
import { commonSchemas } from './common.schemas';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'locum', 'intern', 'volunteer'];
const EMPLOYMENT_STATUSES = ['active', 'probation', 'on_leave', 'suspended', 'terminated'];
const SHIFT_TYPES = ['morning', 'afternoon', 'night', 'on_call'];
const SHIFT_STATUSES = ['scheduled', 'completed', 'cancelled', 'missed'];
const LEAVE_TYPES = ['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid', 'study', 'other'];
const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'half_day', 'on_leave'];

export const staffValidation = {
  // ── Staff profiles ──────────────────────────────────────────────────────────
  create: Joi.object({
    employee_no: Joi.string().max(50).trim().required(),
    first_name: Joi.string().max(100).trim().required(),
    last_name: Joi.string().max(100).trim().required(),
    job_title: Joi.string().max(150).trim().required(),
    employment_type: Joi.string().valid(...EMPLOYMENT_TYPES).default('full_time'),
    employment_status: Joi.string().valid(...EMPLOYMENT_STATUSES).default('active'),
    hire_date: commonSchemas.date.required(),
    termination_date: commonSchemas.date.optional(),
    email: commonSchemas.email.optional(),
    phone: Joi.string().max(30).trim().optional(),
    emergency_contact_name: Joi.string().max(200).trim().optional(),
    emergency_contact_phone: Joi.string().max(30).trim().optional(),
    license_number: Joi.string().max(100).trim().optional(),
    license_type: Joi.string().max(100).trim().optional(),
    license_expiry: commonSchemas.date.optional(),
    base_salary: Joi.number().min(0).precision(2).optional(),
    notes: Joi.string().max(5000).trim().optional(),
    user_id: commonSchemas.optionalUuid,
    department_id: commonSchemas.optionalUuid
  }),
  update: Joi.object({
    first_name: Joi.string().max(100).trim().optional(),
    last_name: Joi.string().max(100).trim().optional(),
    job_title: Joi.string().max(150).trim().optional(),
    employment_type: Joi.string().valid(...EMPLOYMENT_TYPES).optional(),
    employment_status: Joi.string().valid(...EMPLOYMENT_STATUSES).optional(),
    hire_date: commonSchemas.date.optional(),
    termination_date: commonSchemas.date.optional().allow(null),
    email: commonSchemas.email.optional().allow(null),
    phone: Joi.string().max(30).trim().optional().allow(null),
    emergency_contact_name: Joi.string().max(200).trim().optional().allow(null),
    emergency_contact_phone: Joi.string().max(30).trim().optional().allow(null),
    license_number: Joi.string().max(100).trim().optional().allow(null),
    license_type: Joi.string().max(100).trim().optional().allow(null),
    license_expiry: commonSchemas.date.optional().allow(null),
    base_salary: Joi.number().min(0).precision(2).optional().allow(null),
    notes: Joi.string().max(5000).trim().optional().allow(null),
    user_id: commonSchemas.optionalUuid.allow(null),
    department_id: commonSchemas.optionalUuid.allow(null)
  }).min(1),
  list: Joi.object({
    q: Joi.string().max(100).trim().optional(),
    employment_status: Joi.string().valid(...EMPLOYMENT_STATUSES).optional(),
    department_id: commonSchemas.optionalUuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // ── Shifts ────────────────────────────────────────────────────────────────
  createShift: Joi.object({
    staff_id: commonSchemas.uuid,
    shift_type: Joi.string().valid(...SHIFT_TYPES).default('morning'),
    starts_at: commonSchemas.date.required(),
    ends_at: commonSchemas.date.required(),
    is_on_call: Joi.boolean().optional(),
    notes: Joi.string().max(500).trim().optional(),
    department_id: commonSchemas.optionalUuid
  }),
  updateShift: Joi.object({
    shift_type: Joi.string().valid(...SHIFT_TYPES).optional(),
    starts_at: commonSchemas.date.optional(),
    ends_at: commonSchemas.date.optional(),
    is_on_call: Joi.boolean().optional(),
    status: Joi.string().valid(...SHIFT_STATUSES).optional(),
    notes: Joi.string().max(500).trim().optional().allow(null),
    department_id: commonSchemas.optionalUuid.allow(null)
  }).min(1),
  listShifts: Joi.object({
    staff_id: commonSchemas.optionalUuid,
    department_id: commonSchemas.optionalUuid,
    shift_type: Joi.string().valid(...SHIFT_TYPES).optional(),
    status: Joi.string().valid(...SHIFT_STATUSES).optional(),
    on_call: Joi.boolean().optional(),
    from: commonSchemas.date.optional(),
    to: commonSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  roster: Joi.object({
    from: commonSchemas.date.optional(),
    to: commonSchemas.date.optional()
  }),

  // ── Leave ─────────────────────────────────────────────────────────────────
  createLeave: Joi.object({
    staff_id: commonSchemas.uuid,
    leave_type: Joi.string().valid(...LEAVE_TYPES).default('annual'),
    start_date: commonSchemas.date.required(),
    end_date: commonSchemas.date.required(),
    reason: Joi.string().max(1000).trim().optional()
  }),
  reviewLeave: Joi.object({
    review_notes: Joi.string().max(1000).trim().optional()
  }),
  listLeave: Joi.object({
    staff_id: commonSchemas.optionalUuid,
    status: Joi.string().valid(...LEAVE_STATUSES).optional(),
    leave_type: Joi.string().valid(...LEAVE_TYPES).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // ── Attendance ──────────────────────────────────────────────────────────────
  clockIn: Joi.object({
    at: commonSchemas.date.optional(),
    status: Joi.string().valid(...ATTENDANCE_STATUSES).optional(),
    notes: Joi.string().max(500).trim().optional()
  }),
  clockOut: Joi.object({
    at: commonSchemas.date.optional(),
    notes: Joi.string().max(500).trim().optional()
  }),
  listAttendance: Joi.object({
    staff_id: commonSchemas.optionalUuid,
    status: Joi.string().valid(...ATTENDANCE_STATUSES).optional(),
    from: commonSchemas.date.optional(),
    to: commonSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  payrollExport: Joi.object({
    from: commonSchemas.date.required(),
    to: commonSchemas.date.required()
  })
};
