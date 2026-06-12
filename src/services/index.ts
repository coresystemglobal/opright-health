import { userService } from './user.service';
import { authService } from '../modules/auth/auth.service';
import { doctorService } from '../modules/doctors/doctor.service';
import { patientService } from './patient.service';
import { appointmentService } from '../modules/appointments/appointment.service';
import { hospitalService } from './hospital.service';
import { invoiceService } from './invoice.service';
import { paymentService } from '../modules/billing/payment.service';

export {
  userService,
  authService,
  doctorService,
  patientService,
  appointmentService,
  hospitalService,
  invoiceService,
  paymentService
};