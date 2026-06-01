// Model exports
export { User, UserRole } from './user.model';
export { Patient, Gender } from './patient.model';
export { Doctor, Specialization, Department } from './doctor.model';
export { Appointment, AppointmentStatus, AppointmentType, Priority } from './appointment.model';
export { Invoice, PaymentStatus as InvoicePaymentStatus, InvoiceType, InvoiceLineItem } from './invoice.model';
export { Payment, PaymentMethod, PaymentStatus } from './payment.model';
export { Hospital, HospitalType, AccreditationStatus, ContactPerson, OperatingHours, DayHours } from './hospital.model';
export { LabTest } from './lab-test.model';
export { TestOrder } from './test-order.model';
export { TestResult } from './test-result.model';
export { Role, RoleType } from './role.model';
export { Permission } from './permission.model';
export { RolePermission } from './role-permission.model';
export { Tenant, TenantStatus } from './tenant.model';
export { File, FileType } from './file.model';
export { AuditLog, AuditAction } from './audit-log.model';
export { Subscription, PlanType, BillingCycle, SubscriptionStatus } from './subscription.model';
export { UsageTracking } from './usage-tracking.model';
export { FAQ } from './faq.model';
export { Queue, QueuePriority } from './queue.model';
export { Ambulance, AmbulanceStatus } from './ambulance.model';
export { AmbulanceRequest, RequestStatus, EmergencyLevel } from './ambulance-request.model';


// Re-export model instances for database setup
import { User } from './user.model';
import { Patient } from './patient.model';
import { Doctor } from './doctor.model';
import { Appointment } from './appointment.model';
import { Invoice } from './invoice.model';
import { Payment } from './payment.model';
import { Hospital } from './hospital.model';
import { LabTest } from './lab-test.model';
import { TestOrder } from './test-order.model';
import { TestResult } from './test-result.model';
import { Role } from './role.model';
import { Permission } from './permission.model';
import { RolePermission } from './role-permission.model';
import { Tenant } from './tenant.model';
import { File } from './file.model';
import { AuditLog } from './audit-log.model';
import { Subscription } from './subscription.model';
import { UsageTracking } from './usage-tracking.model';
import { FAQ } from './faq.model';
import { Queue } from './queue.model';
import { Ambulance } from './ambulance.model';
import { AmbulanceRequest } from './ambulance-request.model';


export const models = [
  User,
  Patient,
  Doctor,
  Appointment,
  Invoice,
  Payment,
  Hospital,
  LabTest,
  TestOrder,
  TestResult,
  Role,
  Permission,
  RolePermission,
  Tenant,
  File,
  AuditLog,
  Subscription,
  UsageTracking,
  FAQ,
  Queue,
  Ambulance,
  AmbulanceRequest,
];

export default models;