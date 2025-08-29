import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import dashboardController from '../controllers/dashboard.controller';

const dashboardRouter = express.Router();

// Get comprehensive dashboard statistics
dashboardRouter.get("/", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getDashboardStats(req, res);
});

// Get system health metrics
dashboardRouter.get("/health", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getSystemHealth(req, res);
});

// Get revenue analytics for charts and reports
dashboardRouter.get("/analytics/revenue", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getRevenueAnalytics(req, res);
});

// Get patient summary statistics
dashboardRouter.get("/summary/patients", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getPatientSummary(req, res);
});

// Get appointment summary statistics
dashboardRouter.get("/summary/appointments", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getAppointmentSummary(req, res);
});

// Get revenue summary statistics
dashboardRouter.get("/summary/revenue", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getRevenueSummary(req, res);
});

// Get doctor summary statistics
dashboardRouter.get("/summary/doctors", async (req: ExpressRequest, res: Response) => {
  await dashboardController.getDoctorSummary(req, res);
});

export default dashboardRouter;