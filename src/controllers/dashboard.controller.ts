import { Request as ExpressRequest, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { ResponseUtil } from '../utils/response.util';

/**
 * Dashboard controller for handling dashboard and analytics operations
 */
const dashboardController = {
  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const stats = await dashboardService.getDashboardStats();
      
      return ResponseUtil.success(res, stats, 'Dashboard statistics retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve dashboard statistics', 500, [errorMessage]);
    }
  },

  /**
   * Get system health metrics
   */
  getSystemHealth: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const health = await dashboardService.getSystemHealth();
      
      return ResponseUtil.success(res, health, 'System health retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve system health', 500, [errorMessage]);
    }
  },

  /**
   * Get revenue analytics for charts and reports
   */
  getRevenueAnalytics: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { period = 'month' } = req.query;
      
      if (!['week', 'month', 'year'].includes(period as string)) {
        return ResponseUtil.validationError(res, ['Period must be one of: week, month, year']);
      }

      const analytics = await dashboardService.getRevenueAnalytics(period as 'week' | 'month' | 'year');
      
      return ResponseUtil.success(res, analytics, 'Revenue analytics retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve revenue analytics', 500, [errorMessage]);
    }
  },

  /**
   * Get patient summary statistics
   */
  getPatientSummary: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const stats = await dashboardService.getDashboardStats();
      
      return ResponseUtil.success(res, {
        patients: stats.patients,
        recentRegistrations: stats.recentActivity.recentRegistrations.slice(0, 5)
      }, 'Patient summary retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve patient summary', 500, [errorMessage]);
    }
  },

  /**
   * Get appointment summary statistics
   */
  getAppointmentSummary: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const stats = await dashboardService.getDashboardStats();
      
      return ResponseUtil.success(res, {
        appointments: stats.appointments,
        recentAppointments: stats.recentActivity.recentAppointments.slice(0, 5)
      }, 'Appointment summary retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve appointment summary', 500, [errorMessage]);
    }
  },

  /**
   * Get revenue summary statistics
   */
  getRevenueSummary: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const stats = await dashboardService.getDashboardStats();
      
      return ResponseUtil.success(res, {
        revenue: stats.revenue,
        recentPayments: stats.recentActivity.recentPayments.slice(0, 5)
      }, 'Revenue summary retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve revenue summary', 500, [errorMessage]);
    }
  },

  /**
   * Get doctor summary statistics
   */
  getDoctorSummary: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const stats = await dashboardService.getDashboardStats();
      
      return ResponseUtil.success(res, {
        doctors: stats.doctors
      }, 'Doctor summary retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve doctor summary', 500, [errorMessage]);
    }
  }
};

export default dashboardController;