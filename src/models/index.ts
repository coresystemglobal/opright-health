// Model exports
export { User, UserRole } from '@modules/users/user.model';

export { Patient, Gender } from '@modules/patients/patient.model';

export { Doctor, Specialization, Department } from '@modules/doctors/doctor.model';

export { Appointment, AppointmentStatus, AppointmentType, Priority } from '@modules/appointments/appointment.model';

export { Invoice, PaymentStatus as InvoicePaymentStatus, InvoiceType, InvoiceLineItem } from '@modules/billing/invoice.model';

export { Payment, PaymentMethod, PaymentStatus } from '@modules/billing/payment.model';

export { Hospital, HospitalType, AccreditationStatus, ContactPerson, OperatingHours, DayHours } from '@modules/hospital/hospital.model';

export { LabTest } from '@modules/laboratory/lab-test.model';

export { TestOrder } from '@modules/laboratory/test-order.model';

export { TestResult } from '@modules/laboratory/test-result.model';

export { Role, RoleType } from '@modules/rbac/role.model';

export { Permission } from '@modules/rbac/permission.model';

export { RolePermission } from '@modules/rbac/role-permission.model';

export { Tenant, TenantStatus } from '@modules/tenancy/tenant.model';
export { File, FileType } from '@modules/files/file.model';

export { AuditLog, AuditAction } from '@modules/audit/audit-log.model';

export { Subscription, PlanType, BillingCycle, SubscriptionStatus } from '@modules/billing/subscription.model';

export { UsageTracking } from '@modules/billing/usage-tracking.model';

export { FAQ } from '@modules/faq/faq.model';

export { Queue, QueuePriority } from '@modules/queue/queue.model';

export { Ambulance, AmbulanceStatus } from '@modules/ambulance/ambulance.model';

export { AmbulanceRequest, RequestStatus, EmergencyLevel } from '@modules/ambulance/ambulance-request.model';


// EMR Models
export { Allergy, AllergyType, AllergySeverity } from '@modules/clinical/allergy.model';

export { Medication, MedicationRoute, MedicationFrequency } from '@modules/clinical/medication.model';

export { VitalSign } from '@modules/clinical/vital-sign.model';

export { ClinicalNote, NoteType } from '@modules/clinical/clinical-note.model';

export { MedicalRecord, RecordType } from '@modules/clinical/medical-record.model';


// ICD-10 Model
export { ICD10Code } from '@modules/laboratory/icd10-code.model';


// Department Models
export { Department as DepartmentModel } from '@modules/hospital/department.model';

export { DepartmentStaff, DepartmentRole } from '@modules/hospital/department-staff.model';


// Enhanced Scheduler Models
export { AppointmentWaitlist, WaitlistStatus } from '@modules/appointments/appointment-waitlist.model';

export { Resource, ResourceType, ResourceStatus } from '@modules/hospital/resource.model';


// Review Model
export { DoctorReview } from '@modules/doctors/doctor-review.model';


// Family Model
export { FamilyMember, FamilyRelationship } from '@modules/patients/family-member.model';


// Triage Models
export { TriageQuestion } from '@modules/triage/triage-question.model';

export { TriageRule } from '@modules/triage/triage-rule.model';

export { TriageSession } from '@modules/triage/triage-session.model';

export { TriageAnswer } from '@modules/triage/triage-answer.model';

export { TriageResult } from '@modules/triage/triage-result.model';

export { TriageAuditLog } from '@modules/triage/triage-audit-log.model';

export { TokenBlacklist } from '@modules/auth/token-blacklist.model';



// Re-export model instances for database setup
import { User } from '@modules/users/user.model';

import { Patient } from '@modules/patients/patient.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { Invoice } from '@modules/billing/invoice.model';

import { Payment } from '@modules/billing/payment.model';

import { Hospital } from '@modules/hospital/hospital.model';

import { LabTest } from '@modules/laboratory/lab-test.model';

import { TestOrder } from '@modules/laboratory/test-order.model';

import { TestResult } from '@modules/laboratory/test-result.model';

import { Role } from '@modules/rbac/role.model';

import { Permission } from '@modules/rbac/permission.model';

import { RolePermission } from '@modules/rbac/role-permission.model';

import { Tenant } from '@modules/tenancy/tenant.model';
import { File } from '@modules/files/file.model';

import { AuditLog } from '@modules/audit/audit-log.model';

import { Subscription } from '@modules/billing/subscription.model';

import { UsageTracking } from '@modules/billing/usage-tracking.model';

import { FAQ } from '@modules/faq/faq.model';

import { Queue } from '@modules/queue/queue.model';

import { Ambulance } from '@modules/ambulance/ambulance.model';

import { AmbulanceRequest } from '@modules/ambulance/ambulance-request.model';


// EMR Models
import { Allergy } from '@modules/clinical/allergy.model';

import { Medication } from '@modules/clinical/medication.model';

import { VitalSign } from '@modules/clinical/vital-sign.model';

import { ClinicalNote } from '@modules/clinical/clinical-note.model';

import { MedicalRecord } from '@modules/clinical/medical-record.model';


// ICD-10 Model
import { ICD10Code } from '@modules/laboratory/icd10-code.model';


// Department Models
import { Department as DepartmentModel } from '@modules/hospital/department.model';

import { DepartmentStaff } from '@modules/hospital/department-staff.model';


// Enhanced Scheduler Models
import { AppointmentWaitlist } from '@modules/appointments/appointment-waitlist.model';

import { Resource } from '@modules/hospital/resource.model';


// Review Model
import { DoctorReview } from '@modules/doctors/doctor-review.model';


// Family Model
import { FamilyMember } from '@modules/patients/family-member.model';


// Triage Models
import { TriageQuestion } from '@modules/triage/triage-question.model';

import { TriageRule } from '@modules/triage/triage-rule.model';

import { TriageSession } from '@modules/triage/triage-session.model';

import { TriageAnswer } from '@modules/triage/triage-answer.model';

import { TriageResult } from '@modules/triage/triage-result.model';

import { TriageAuditLog } from '@modules/triage/triage-audit-log.model';

import { TokenBlacklist } from '@modules/auth/token-blacklist.model';


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
  // EMR Models
  Allergy,
  Medication,
  VitalSign,
  ClinicalNote,
  MedicalRecord,
  // ICD-10
  ICD10Code,
  // Department
  DepartmentModel,
  DepartmentStaff,
  // Scheduler
  AppointmentWaitlist,
  Resource,
  // Reviews
  DoctorReview,
  // Family
  FamilyMember,
  // Triage
  TriageQuestion,
  TriageRule,
  TriageSession,
  TriageAnswer,
  TriageResult,
  TriageAuditLog,
  TokenBlacklist,
];

export default models;