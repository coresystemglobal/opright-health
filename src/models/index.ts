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
  TestResult
];

export default models;