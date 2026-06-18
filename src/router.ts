import { Router } from 'express';

// Import route files - using existing routes
// Note: Some module routes may not exist, using available routes
import appointmentRouter from './routes/appointment.route';
import invoiceRouter from './routes/invoice.route';
import paymentRouter from './routes/payment.route';
import dashboardRouter from './routes/dashboard.route';
import reportsRouter from './routes/reports.route';
import authRouter from './routes/auth.route';
import laboratoryRouter from './routes/laboratory.route';
import roleRouter from './routes/role.route';
import permissionRouter from './routes/permission.route';
import fileRouter from './routes/file.route';
import auditRouter from './routes/audit.route';
import healthRouter from './routes/health.route';
import notificationRouter from './routes/notification.route';
import docsRouter from './routes/docs.route';
import fhirRouter from './routes/fhir.route';
import mobileRouter from './routes/mobile.route';
import billingRouter from './routes/billing.route';
import advancedRouter from './routes/advanced-features.route';
import faqRouter from './routes/faq.route';
import queueRouter from './routes/queue.route';
import ambulanceRouter from './routes/ambulance.route';

// Initialize router
const router = Router();

// Apply rate limiting to auth routes
import { authRateLimit, apiRateLimit } from './middlewares/rate-limit.middleware';
import { requireActiveSubscription } from './middlewares/billing.middleware';

// Mount routes
router.use('/auth', authRateLimit, authRouter);

// Apply general rate limiting to all API routes
router.use('/api', apiRateLimit);

// Subscription gate — all /api/* routes require an active subscription.
// Auth routes (/auth) are intentionally excluded so login/register always works.
router.use('/api', requireActiveSubscription);
// router.use('/users', userRouter); // Commented out - module may not exist
// router.use('/login', loginRouter); // Commented out - module may not exist
router.use('/api/roles', roleRouter);
// router.use('/profiles', profileRouter); // Commented out - module may not exist
// router.use('/patients', patientRouter); // Commented out - module may not exist
// router.use('/doctors', doctorRouter); // Commented out - module may not exist
router.use('/api/appointments', appointmentRouter);
router.use('/api/invoices', invoiceRouter);
router.use('/api/payments', paymentRouter);
router.use('/api/dashboard', dashboardRouter);
router.use('/api/reports', reportsRouter);
router.use('/api/laboratory', laboratoryRouter);
router.use('/api/permissions', permissionRouter);
router.use('/api/files', fileRouter);
router.use('/api/audit', auditRouter);
router.use('/api/notifications', notificationRouter);
router.use('/', healthRouter);
router.use('/notifications', notificationRouter);
router.use('/api-docs', docsRouter);
router.use('/api/fhir', fhirRouter);
router.use('/api/mobile', mobileRouter);
router.use('/api/billing', billingRouter);
router.use('/api/advanced', advancedRouter);
router.use('/api/faqs', faqRouter);
router.use('/api/queue', queueRouter);
router.use('/api/ambulance', ambulanceRouter);

export default router;