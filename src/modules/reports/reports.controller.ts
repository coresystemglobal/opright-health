import { Request as ExpressRequest, Response } from 'express';
import { reportsService } from '@modules/reports/reports.service';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@config/rbac.config';
import {
  flattenPatientDemographics,
  flattenDoctorPerformance,
  flattenFinancial,
  flattenAppointmentAnalytics,
  flattenInventoryValuation,
  flattenOperationalMetrics,
  flattenTrends,
  renderCsv,
  renderExcel,
  renderPdf
} from '@modules/reports/report-export.service';

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

  getTrendsReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const metric = (req.query.metric as string) || 'revenue';
      const period = (req.query.period as string) || 'daily';
      if (!['revenue', 'patients', 'appointments'].includes(metric)) {
        return res.status(400).json({ success: false, message: 'metric must be one of: revenue, patients, appointments' });
      }
      if (!['daily', 'weekly', 'monthly'].includes(period)) {
        return res.status(400).json({ success: false, message: 'period must be one of: daily, weekly, monthly' });
      }

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      let dateRange;
      if (startDate && endDate) {
        dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({ success: false, message: 'Start date must be before end date' });
        }
      }

      const report = await reportsService.getTrendsReport({ metric: metric as any, period: period as any, dateRange });
      return res.status(200).json({
        success: true,
        message: 'Trends report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get trends report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getOperationalMetricsReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      let dateRange;
      if (startDate && endDate) {
        dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({ success: false, message: 'Start date must be before end date' });
        }
      }

      const report = await reportsService.getOperationalMetricsReport(dateRange);
      return res.status(200).json({
        success: true,
        message: 'Operational metrics report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get operational metrics report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  getInventoryValuationReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID is required' });
      }

      const report = await reportsService.getInventoryValuationReport(tenantId);
      return res.status(200).json({
        success: true,
        message: 'Inventory valuation report retrieved successfully',
        data: report
      });
    } catch (error) {
      console.error('Get inventory valuation report error:', error);
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
      const { reportType, format = 'json', startDate, endDate } = req.query as Record<string, string>;

      if (!reportType) {
        return res.status(400).json({
          success: false,
          message: 'Report type is required'
        });
      }

      // Finance-tier report types require finance access even via export
      // (the route only enforces reports:view broadly).
      if (['financial', 'inventory-valuation'].includes(reportType)) {
        const role = (req as any).user?.role;
        const perms = ROLE_PERMISSIONS[role] || [];
        if (!perms.includes(PERMISSIONS.INVOICE_VIEW)) {
          return res.status(403).json({ success: false, message: 'Access denied - finance permission required to export this report' });
        }
      }

      const supportedFormats = ['json', 'csv', 'pdf', 'xlsx'];
      if (!supportedFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported format. Supported formats: ${supportedFormats.join(', ')}`
        });
      }

      let dateRange;
      if (startDate && endDate) {
        dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
        if (dateRange.startDate > dateRange.endDate) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be before end date'
          });
        }
      }

      // Fetch the raw report and flatten it into export-ready tables
      let flat;
      switch (reportType) {
        case 'patient-demographics':
          flat = flattenPatientDemographics(await reportsService.getPatientDemographicsReport(dateRange));
          break;
        case 'doctor-performance':
          flat = flattenDoctorPerformance(await reportsService.getDoctorPerformanceReport(dateRange));
          break;
        case 'financial':
          flat = flattenFinancial(await reportsService.getFinancialReport(dateRange));
          break;
        case 'appointment-analytics':
          flat = flattenAppointmentAnalytics(await reportsService.getAppointmentAnalyticsReport(dateRange));
          break;
        case 'inventory-valuation': {
          const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
          if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID is required for inventory valuation' });
          }
          flat = flattenInventoryValuation(await reportsService.getInventoryValuationReport(tenantId));
          break;
        }
        case 'operational-metrics':
          flat = flattenOperationalMetrics(await reportsService.getOperationalMetricsReport(dateRange));
          break;
        case 'trends': {
          const metric = (req.query.metric as string) || 'revenue';
          const period = (req.query.period as string) || 'daily';
          if (!['revenue', 'patients', 'appointments'].includes(metric) || !['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ success: false, message: 'Invalid metric or period for trends export' });
          }
          flat = flattenTrends(await reportsService.getTrendsReport({ metric: metric as any, period: period as any, dateRange }));
          break;
        }
        default:
          return res.status(400).json({
            success: false,
            message: `Unknown report type '${reportType}'. Supported: patient-demographics, doctor-performance, financial, appointment-analytics, inventory-valuation, operational-metrics, trends`
          });
      }

      const filename = `${reportType}-${new Date().toISOString().split('T')[0]}`;

      switch (format) {
        case 'csv': {
          const csv = renderCsv(flat);
          res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.csv"`
          });
          return res.send(csv);
        }
        case 'xlsx': {
          const xlsx = await renderExcel(flat);
          res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
            'Content-Length': xlsx.length.toString()
          });
          return res.end(xlsx);
        }
        case 'pdf': {
          const pdf = await renderPdf(flat);
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}.pdf"`,
            'Content-Length': pdf.length.toString()
          });
          return res.end(pdf);
        }
        default: // json
          return res.status(200).json({
            success: true,
            message: 'Report exported successfully',
            data: flat
          });
      }
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