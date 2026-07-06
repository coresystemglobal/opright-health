import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import dashboardController from './dashboard.controller';

const dashboardRouter = express.Router();

dashboardRouter.get("/", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getDashboardStats(req, res);
});

dashboardRouter.get("/health", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getSystemHealth(req, res);
});

// Aggregated analytics dashboard — all KPIs in one call (overview + trends + realtime)
// Query: startDate/endDate (default last 30 days); tenant via x-tenant-id header
dashboardRouter.get("/analytics", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getAnalyticsDashboard(req, res);
});

dashboardRouter.get("/analytics/revenue", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getRevenueAnalytics(req, res);
});

dashboardRouter.get("/summary/patients", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getPatientSummary(req, res);
});

dashboardRouter.get("/summary/appointments", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getAppointmentSummary(req, res);
});

dashboardRouter.get("/summary/revenue", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getRevenueSummary(req, res);
});

dashboardRouter.get("/summary/doctors", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getDoctorSummary(req, res);
});

export default dashboardRouter;
