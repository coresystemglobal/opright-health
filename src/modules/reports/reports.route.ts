import { Router } from 'express';
import { reportsController } from './reports.controller';

const router = Router();

router.get('/patient-demographics', reportsController.getPatientDemographicsReport);

router.get('/doctor-performance', reportsController.getDoctorPerformanceReport);

router.get('/financial', reportsController.getFinancialReport);

router.get('/appointment-analytics', reportsController.getAppointmentAnalyticsReport);

router.get('/system-health', reportsController.getSystemHealthReport);

router.post('/custom', reportsController.getCustomReport);

router.get('/export', reportsController.exportReport);

export default router;
