import { Router } from 'express';
import { reportsController } from './reports.controller';

const router = Router();

/**
 * @route GET /reports/patient-demographics
 * @desc Get patient demographics report
 * @query {string} [startDate] - Start date for filtering (YYYY-MM-DD)
 * @query {string} [endDate] - End date for filtering (YYYY-MM-DD)
 * @access Private (Admin/Staff)
 */
router.get('/patient-demographics', reportsController.getPatientDemographicsReport);

/**
 * @route GET /reports/doctor-performance
 * @desc Get doctor performance report
 * @query {string} [startDate] - Start date for filtering (YYYY-MM-DD)
 * @query {string} [endDate] - End date for filtering (YYYY-MM-DD)
 * @query {string} [doctorId] - Filter by specific doctor ID
 * @query {string} [page] - Page number for pagination
 * @query {string} [limit] - Number of items per page
 * @access Private (Admin/Staff)
 */
router.get('/doctor-performance', reportsController.getDoctorPerformanceReport);

/**
 * @route GET /reports/financial
 * @desc Get financial report
 * @query {string} [startDate] - Start date for filtering (YYYY-MM-DD)
 * @query {string} [endDate] - End date for filtering (YYYY-MM-DD)
 * @access Private (Admin/Staff)
 */
router.get('/financial', reportsController.getFinancialReport);

/**
 * @route GET /reports/appointment-analytics
 * @desc Get appointment analytics report
 * @query {string} [startDate] - Start date for filtering (YYYY-MM-DD)
 * @query {string} [endDate] - End date for filtering (YYYY-MM-DD)
 * @access Private (Admin/Staff)
 */
router.get('/appointment-analytics', reportsController.getAppointmentAnalyticsReport);

/**
 * @route GET /reports/system-health
 * @desc Get system health report
 * @access Private (Admin only)
 */
router.get('/system-health', reportsController.getSystemHealthReport);

/**
 * @route POST /reports/custom
 * @desc Generate custom reports
 * @body {string} reportType - Type of custom report
 * @body {object} parameters - Report parameters
 * @access Private (Admin/Staff)
 */
router.post('/custom', reportsController.getCustomReport);

/**
 * @route GET /reports/export
 * @desc Export reports in various formats
 * @query {string} reportType - Type of report to export
 * @query {string} [format=json] - Export format (json, csv, pdf)
 * @access Private (Admin/Staff)
 */
router.get('/export', reportsController.exportReport);

export default router;