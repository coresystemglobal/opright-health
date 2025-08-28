// Model exports
export { User, UserRole } from './user.model';
export { Patient, Gender } from './patient.model';
export { Doctor, Specialization, Department } from './doctor.model';
export { Appointment, AppointmentStatus, AppointmentType, Priority } from './appointment.model';
export { Invoice, PaymentStatus as InvoicePaymentStatus, InvoiceType, InvoiceLineItem } from './invoice.model';
export { Payment, PaymentMethod, PaymentStatus } from './payment.model';
export { Hospital, HospitalType, AccreditationStatus, ContactPerson, OperatingHours, DayHours } from './hospital.model';

// Re-export model instances for database setup
import { User } from './user.model';
import { Patient } from './patient.model';
import { Doctor } from './doctor.model';
import { Appointment } from './appointment.model';
import { Invoice } from './invoice.model';
import { Payment } from './payment.model';
import { Hospital } from './hospital.model';

export const models = [
  User,
  Patient,
  Doctor,
  Appointment,
  Invoice,
  Payment,
  Hospital
];

export default models;