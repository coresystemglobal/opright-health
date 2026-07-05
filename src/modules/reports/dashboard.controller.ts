import { Request as ExpressRequest, Response } from 'express';
import { dashboardService } from '@modules/reports/dashboard.service';
import { AnalyticsService } from '@modules/reports/analytics.service';
import { getFromRedis, saveToRedis } from '@core/redis';

import { ResponseUtil } from '@utils/response.util';

const ANALYTICS_CACHE_TTL = 60; // seconds — dashboards tolerate 1-minute staleness

/**
 * Dashboard controller for handling dashboard and analytics operations
 */
const dashboardController = {
  /**
   * Aggregated analytics dashboard — every KPI the frontend dashboard
   * needs in a single call. Returns raw series data; charts are
   * rendered client-side.
   *
   * Combines:
   *  - overview: headline stats (patients, doctors, appointments, revenue, recent activity)
   *  - trends: daily patient/revenue series, appointment breakdown, performance KPIs, predictive insights
   *  - realtime: today's live counters
   *
   * Query: startDate/endDate (default: last 30 days). Tenant from x-tenant-id.
   */
  getAnalyticsDashboard: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return ResponseUtil.error(res, 'Tenant ID is required (x-tenant-id header)', 400);
      }

      const { startDate, endDate } = req.query as Record<string, string>;
      const end   = endDate   ? new Date(endDate)   : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return ResponseUtil.validationError(res, ['Invalid startDate or endDate']);
      }
      if (start > end) {
        return ResponseUtil.validationError(res, ['startDate must be before endDate']);
      }

      const cacheKey = `analytics_dashboard:${tenantId}:${start.toISOString().slice(0, 10)}:${end.toISOString().slice(0, 10)}`;
      const cached = await getFromRedis(cacheKey).catch(() => null);
      if (cached) {
        try {
          return ResponseUtil.success(res, JSON.parse(cached), 'Analytics dashboard retrieved (cached)');
        } catch { /* fall through to fresh fetch */ }
      }

      const [overview, trends, realtime] = await Promise.all([
        dashboardService.getDashboardStats(),
        AnalyticsService.getAdvancedAnalytics(tenantId, { start, end }),
        AnalyticsService.getRealtimeMetrics(tenantId)
      ]);

      const payload = {
        period: {
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10)
        },
        overview,
        trends,
        realtime
      };

      await saveToRedis(cacheKey, JSON.stringify(payload), ANALYTICS_CACHE_TTL).catch(() => null);

      return ResponseUtil.success(res, payload, 'Analytics dashboard retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve analytics dashboard', 500, [errorMessage]);
    }
  },

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