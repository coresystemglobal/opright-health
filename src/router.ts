import { Router } from 'express';
import { authRateLimit, apiRateLimit } from './middlewares/rate-limiter.middleware';
import { requireActiveSubscription } from './middlewares/billing.middleware';

// Auth & Users
import authRouter from '@modules/auth/auth.route';
import userRouter from '@modules/users/user.route';

// RBAC
import roleRouter from '@modules/rbac/role.route';
import permissionRouter from '@modules/rbac/permission.route';

// Patients
import patientRouter from '@modules/patients/patient.route';
import familyRouter from '@modules/patients/family.route';
import patientPortalRouter from '@modules/portal/patient-portal.route';

// Doctors
import doctorRouter from '@modules/doctors/doctor.route';
import reviewRouter from '@modules/doctors/review.route';

// Hospital
import hospitalRouter from '@modules/hospital/hospital.route';
import departmentRouter from '@modules/hospital/department.route';

// Wards & Beds
import wardRouter from '@modules/wards/ward.route';
import bedRouter from '@modules/wards/bed.route';
import admissionRouter from '@modules/wards/admission.route';

// Appointments & Clinical
import appointmentRouter from '@modules/appointments/appointment.route';
import medicationRouter from '@modules/clinical/medication.route';
import clinicalNoteRouter from '@modules/clinical/clinical-note.route';
import vitalSignRouter from '@modules/clinical/vital-sign.route';
import prescriptionRouter from '@modules/clinical/prescription.route';

// Triage
import triageRouter from '@modules/triage/triage.route';

// Operations
import queueRouter from '@modules/queue/queue.route';
import ambulanceRouter from '@modules/ambulance/ambulance.route';

// Laboratory
import laboratoryRouter from '@modules/laboratory/laboratory.route';

// Billing
import billingRouter from '@modules/billing/billing.route';
import invoiceRouter from '@modules/billing/invoice.route';
import paymentRouter from '@modules/billing/payment.route';

// Reports & Analytics
import reportsRouter from '@modules/reports/reports.route';
import dashboardRouter from '@modules/reports/dashboard.route';
import advancedRouter from '@modules/reports/advanced-features.route';

// Notifications & Files
import notificationRouter from '@modules/notifications/notification.route';
import fileRouter from '@modules/files/file.route';

// Integrations
import fhirRouter from '@modules/fhir/fhir.route';

// System
import auditRouter from '@modules/audit/audit.route';
import faqRouter from '@modules/faq/faq.route';
import mobileRouter from '@modules/mobile/mobile.route';
import healthRouter from '@modules/health/health.route';
import docsRouter from '@modules/health/docs.route';
import visitorRouter from '@modules/visitors/visitor-log.route';
import tenantSettingsRouter from '@modules/tenancy/tenant-settings.route';

const router = Router();

// Auth (rate-limited separately)
router.use('/auth', authRateLimit, authRouter);

// Apply general rate limiting to all API routes
router.use('/api', apiRateLimit);

// Subscription gate — enforced for any /api request that identifies a
// tenant (x-tenant-id). Auth routes are excluded so login always works.
router.use('/api', requireActiveSubscription);

// Users & RBAC
router.use('/api/users', userRouter);
router.use('/api/roles', roleRouter);
router.use('/api/permissions', permissionRouter);

// Patients
router.use('/api/patients', patientRouter);
router.use('/api/family', familyRouter);
router.use('/api/portal', patientPortalRouter);

// Doctors
router.use('/api/doctors', doctorRouter);
router.use('/api/reviews', reviewRouter);

// Hospital
router.use('/api/hospitals', hospitalRouter);
router.use('/api/departments', departmentRouter);
router.use('/api/wards', wardRouter);
router.use('/api/beds', bedRouter);
router.use('/api/admissions', admissionRouter);

// Appointments & Clinical
router.use('/api/appointments', appointmentRouter);
router.use('/api/medications', medicationRouter);
router.use('/api/clinical-notes', clinicalNoteRouter);
router.use('/api/vital-signs', vitalSignRouter);
router.use('/api/prescriptions', prescriptionRouter);

// Triage
router.use('/api/triage', triageRouter);

// Operations
router.use('/api/queue', queueRouter);
router.use('/api/ambulance', ambulanceRouter);

// Laboratory
router.use('/api/laboratory', laboratoryRouter);

// Billing
router.use('/api/billing', billingRouter);
router.use('/api/invoices', invoiceRouter);
router.use('/api/payments', paymentRouter);

// Reports & Analytics
router.use('/api/reports', reportsRouter);
router.use('/api/dashboard', dashboardRouter);
router.use('/api/advanced', advancedRouter);

// Notifications & Files
router.use('/api/notifications', notificationRouter);
router.use('/api/files', fileRouter);

// Integrations
router.use('/api/fhir', fhirRouter);

// System
router.use('/api/audit', auditRouter);
router.use('/api/faqs', faqRouter);
router.use('/api/mobile', mobileRouter);
router.use('/api/tenant', tenantSettingsRouter);

// Visitor Logs (check-in/check-out public, list staff-only)
router.use('/api/visitors', visitorRouter);

// Health & Docs (no /api prefix)
router.use('/', healthRouter);
router.use('/api-docs', docsRouter);
router.use('/notifications', notificationRouter);

export default router;
