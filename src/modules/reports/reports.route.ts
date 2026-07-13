import { Router } from 'express';
import { reportsController } from './reports.controller';
import reportScheduleController from './report-schedule.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, reportScheduleValidation, genericValidation } from '@utils/validator';

const router = Router();

// All report endpoints require an authenticated, tenant-scoped caller.
router.use(authentication, tenantMiddleware);

// Access control by report class:
//  - clinical / operational summaries      → reports:view
//  - money & inventory-value reports        → invoice:view (finance)
//  - trend / operational analytics + infra  → analytics:view
const REPORTS_VIEW = checkPermission(PERMISSIONS.REPORTS_VIEW);
const FINANCE_VIEW = checkPermission(PERMISSIONS.INVOICE_VIEW);
const ANALYTICS_VIEW = checkPermission(PERMISSIONS.ANALYTICS_VIEW);

router.get('/patient-demographics', REPORTS_VIEW, reportsController.getPatientDemographicsReport);
router.get('/doctor-performance', REPORTS_VIEW, reportsController.getDoctorPerformanceReport);
router.get('/appointment-analytics', REPORTS_VIEW, reportsController.getAppointmentAnalyticsReport);

router.get('/financial', FINANCE_VIEW, reportsController.getFinancialReport);
router.get('/inventory-valuation', FINANCE_VIEW, reportsController.getInventoryValuationReport);

router.get('/operational-metrics', ANALYTICS_VIEW, reportsController.getOperationalMetricsReport);
// ?metric=revenue|patients|appointments&period=daily|weekly|monthly&startDate=&endDate=
router.get('/trends', ANALYTICS_VIEW, reportsController.getTrendsReport);

// Infrastructure/system health — analytics-tier (admins) only
router.get('/system-health', ANALYTICS_VIEW, reportsController.getSystemHealthReport);

// ── Configurable report schedules (analytics-tier) ──────────────────────────
router.post('/schedules', ANALYTICS_VIEW, validate(reportScheduleValidation.create), reportScheduleController.create);
router.get('/schedules', ANALYTICS_VIEW, reportScheduleController.list);
router.get('/schedules/:id', ANALYTICS_VIEW, validateParams(genericValidation.id), reportScheduleController.get);
router.put('/schedules/:id', ANALYTICS_VIEW, validateParams(genericValidation.id), validate(reportScheduleValidation.update), reportScheduleController.update);
router.delete('/schedules/:id', ANALYTICS_VIEW, validateParams(genericValidation.id), reportScheduleController.remove);
router.post('/schedules/:id/run', ANALYTICS_VIEW, validateParams(genericValidation.id), reportScheduleController.runNow);

router.post('/custom', REPORTS_VIEW, reportsController.getCustomReport);

// Export any report type (json/csv/xlsx/pdf). Requires reports:view; the
// finance-only report types additionally validate finance access below.
// ?reportType=…&format=…&startDate=&endDate=
router.get('/export', REPORTS_VIEW, reportsController.exportReport);

export default router;
