import { Router } from 'express';
import { reportsController } from './reports.controller';

const router = Router();

router.get('/patient-demographics', reportsController.getPatientDemographicsReport);

router.get('/doctor-performance', reportsController.getDoctorPerformanceReport);

router.get('/financial', reportsController.getFinancialReport);

router.get('/appointment-analytics', reportsController.getAppointmentAnalyticsReport);

router.get('/inventory-valuation', reportsController.getInventoryValuationReport);

router.get('/operational-metrics', reportsController.getOperationalMetricsReport);

// ?metric=revenue|patients|appointments&period=daily|weekly|monthly&startDate=&endDate=
router.get('/trends', reportsController.getTrendsReport);

router.get('/system-health', reportsController.getSystemHealthReport);

router.post('/custom', reportsController.getCustomReport);

// ?reportType=patient-demographics|doctor-performance|financial|appointment-analytics&format=json|csv|xlsx|pdf&startDate=&endDate=
router.get('/export', reportsController.exportReport);

export default router;
