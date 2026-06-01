import { Request as ExpressRequest, Response } from 'express';
import { reportsService } from '@modules/reports/reports.service';

import { PaginationQuery } from '@appTypes/common.types';

interface ReportsRequest extends ExpressRequest {
  query: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    page?: string;
    limit?: string;
    offset?: string;
  };
}

export const reportsController = {
  getPatientDemographicsReport: async (req: ReportsRequest, res: Response): Promise<Response> => {
    try {
      const { startDate, endDate } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };

        // Validate date range
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be before end date'
          });
        }
      }

      const report = await reportsService.getPatientDemographicsReport(dateRange);

      return res.status(200).json({
        success: true,
        message: 'Patient demographics report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get patient demographics report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getDoctorPerformanceReport: async (req: ReportsRequest, res: Response): Promise<Response> => {
    try {
      const { startDate, endDate, doctorId, page, limit, offset } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };

        // Validate date range
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be before end date'
          });
        }
      }

      const paginationQuery: PaginationQuery = {
        page,
        limit
      };

      const report = await reportsService.getDoctorPerformanceReport(
        dateRange,
        doctorId,
        paginationQuery
      );

      return res.status(200).json({
        success: true,
        message: 'Doctor performance report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get doctor performance report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getFinancialReport: async (req: ReportsRequest, res: Response): Promise<Response> => {
    try {
      const { startDate, endDate } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };

        // Validate date range
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be before end date'
          });
        }
      }

      const report = await reportsService.getFinancialReport(dateRange);

      return res.status(200).json({
        success: true,
        message: 'Financial report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get financial report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getAppointmentAnalyticsReport: async (req: ReportsRequest, res: Response): Promise<Response> => {
    try {
      const { startDate, endDate } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };

        // Validate date range
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be before end date'
          });
        }
      }

      const report = await reportsService.getAppointmentAnalyticsReport(dateRange);

      return res.status(200).json({
        success: true,
        message: 'Appointment analytics report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get appointment analytics report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getSystemHealthReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      // System health metrics
      const systemHealth = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      };

      return res.status(200).json({
        success: true,
        message: 'System health report retrieved successfully',
        data: systemHealth
      });
    } catch (error) {
      console.error('Get system health report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getCustomReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { reportType, parameters } = req.body;

      if (!reportType) {
        return res.status(400).json({
          success: false,
          message: 'Report type is required'
        });
      }

      // This endpoint allows for future custom report implementations
      // For now, return a placeholder response
      return res.status(200).json({
        success: true,
        message: 'Custom report endpoint - not implemented yet',
        data: {
          reportType,
          parameters,
          note: 'Custom reports will be implemented based on specific requirements'
        }
      });
    } catch (error) {
      console.error('Get custom report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  exportReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { reportType, format = 'json' } = req.query;

      if (!reportType) {
        return res.status(400).json({
          success: false,
          message: 'Report type is required'
        });
      }

      // Validate format
      const supportedFormats = ['json', 'csv', 'pdf'];
      if (!supportedFormats.includes(format as string)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported format. Supported formats: ${supportedFormats.join(', ')}`
        });
      }

      // This endpoint allows for future report export implementations
      // For now, return a placeholder response
      return res.status(200).json({
        success: true,
        message: 'Report export endpoint - not implemented yet',
        data: {
          reportType,
          format,
          note: 'Report export functionality will be implemented based on specific requirements'
        }
      });
    } catch (error) {
      console.error('Export report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};