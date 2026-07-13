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

export { Prescription, PrescriptionStatus } from '@modules/clinical/prescription.model';

export { PrescriptionItem } from '@modules/clinical/prescription-item.model';

// Notification Models
export { Notification, NotificationType, NotificationChannel } from '@modules/notifications/notification.model';

export { PushSubscription, PushPlatform } from '@modules/notifications/push-subscription.model';

export { NotificationPreference } from '@modules/notifications/notification-preference.model';


// ICD-10 Model
export { ICD10Code } from '@modules/laboratory/icd10-code.model';


// Department Models
export { Department as DepartmentModel } from '@modules/hospital/department.model';

export { DepartmentStaff, DepartmentRole } from '@modules/hospital/department-staff.model';


// Enhanced Scheduler Models
export { AppointmentWaitlist, WaitlistStatus } from '@modules/appointments/appointment-waitlist.model';

export { Resource, ResourceType, ResourceStatus } from '@modules/hospital/resource.model';

// Ward / Bed / Admission Models
export { Ward, WardType, WardGenderRestriction } from '@modules/wards/ward.model';

export { Bed, BedType, BedStatus } from '@modules/wards/bed.model';

export { Admission, AdmissionStatus } from '@modules/wards/admission.model';

// Pharmacy / Inventory Models
export { PharmacyItem, DrugForm, StockUnit } from '@modules/pharmacy/pharmacy-item.model';

export { StockBatch } from '@modules/pharmacy/stock-batch.model';

export { StockMovement, MovementType } from '@modules/pharmacy/stock-movement.model';

// Insurance / Claims Models
export { InsuranceProvider, ProviderType } from '@modules/insurance/insurance-provider.model';

export { PatientInsurancePolicy, PolicyRelationship, PolicyStatus } from '@modules/insurance/patient-policy.model';

export { InsuranceClaim, ClaimType, ClaimStatus } from '@modules/insurance/claim.model';

// Compliance Models
export { ConsentRecord, ConsentType } from '@modules/compliance/consent.model';

export { DataSubjectRequest, DataRequestType, DataRequestStatus } from '@modules/compliance/data-subject-request.model';

export { ConsentSignature, SignerRole, SignatureType } from '@modules/compliance/consent-signature.model';

export { ReportSchedule, ScheduledReportType, ScheduleFormat, ScheduleFrequency } from '@modules/reports/report-schedule.model';

// Medical Supplies / Equipment Models
export { SupplyItem, SupplyCategory, SupplyUnit } from '@modules/supplies/supply-item.model';

export { SupplyMovement, SupplyMovementType } from '@modules/supplies/supply-movement.model';

export { Equipment, EquipmentCategory, EquipmentStatus } from '@modules/supplies/equipment.model';


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

export { VisitorLog, VisitorStatus, VisitPurpose, VisitorIdType } from '@modules/visitors/visitor-log.model';



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

import { Prescription } from '@modules/clinical/prescription.model';

import { PrescriptionItem } from '@modules/clinical/prescription-item.model';

import { Notification } from '@modules/notifications/notification.model';

import { PushSubscription } from '@modules/notifications/push-subscription.model';

import { NotificationPreference } from '@modules/notifications/notification-preference.model';


// ICD-10 Model
import { ICD10Code } from '@modules/laboratory/icd10-code.model';


// Department Models
import { Department as DepartmentModel } from '@modules/hospital/department.model';

import { DepartmentStaff } from '@modules/hospital/department-staff.model';


// Enhanced Scheduler Models
import { AppointmentWaitlist } from '@modules/appointments/appointment-waitlist.model';

import { Resource } from '@modules/hospital/resource.model';

import { Ward } from '@modules/wards/ward.model';

import { Bed } from '@modules/wards/bed.model';

import { Admission } from '@modules/wards/admission.model';

import { PharmacyItem } from '@modules/pharmacy/pharmacy-item.model';

import { StockBatch } from '@modules/pharmacy/stock-batch.model';

import { StockMovement } from '@modules/pharmacy/stock-movement.model';

import { InsuranceProvider } from '@modules/insurance/insurance-provider.model';

import { PatientInsurancePolicy } from '@modules/insurance/patient-policy.model';

import { InsuranceClaim } from '@modules/insurance/claim.model';

import { ConsentRecord } from '@modules/compliance/consent.model';

import { DataSubjectRequest } from '@modules/compliance/data-subject-request.model';

import { ConsentSignature } from '@modules/compliance/consent-signature.model';

import { ReportSchedule } from '@modules/reports/report-schedule.model';

import { SupplyItem } from '@modules/supplies/supply-item.model';

import { SupplyMovement } from '@modules/supplies/supply-movement.model';

import { Equipment } from '@modules/supplies/equipment.model';


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

import { VisitorLog } from '@modules/visitors/visitor-log.model';

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
  Prescription,
  PrescriptionItem,
  // Notifications
  Notification,
  PushSubscription,
  NotificationPreference,
  // ICD-10
  ICD10Code,
  // Department
  DepartmentModel,
  DepartmentStaff,
  Ward,
  Bed,
  Admission,
  PharmacyItem,
  StockBatch,
  StockMovement,
  InsuranceProvider,
  PatientInsurancePolicy,
  InsuranceClaim,
  ConsentRecord,
  DataSubjectRequest,
  ConsentSignature,
  ReportSchedule,
  SupplyItem,
  SupplyMovement,
  Equipment,
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
  VisitorLog,
];

export default models;