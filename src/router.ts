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

// Initialize router
const router = Router();

// Mount routes
router.use('/auth', authRouter);
// router.use('/users', userRouter); // Commented out - module may not exist
// router.use('/login', loginRouter); // Commented out - module may not exist
// router.use('/roles', roleRouter); // Commented out - module may not exist
// router.use('/profiles', profileRouter); // Commented out - module may not exist
// router.use('/patients', patientRouter); // Commented out - module may not exist
// router.use('/doctors', doctorRouter); // Commented out - module may not exist
router.use('/appointments', appointmentRouter);
router.use('/invoices', invoiceRouter);
router.use('/payments', paymentRouter);
router.use('/dashboard', dashboardRouter);
router.use('/reports', reportsRouter);
router.use('/laboratory', laboratoryRouter);

export default router;