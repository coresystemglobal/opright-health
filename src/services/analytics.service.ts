import sequelize from '../core/database';
import { QueryTypes } from 'sequelize';

interface AnalyticsData {
  patientTrends: any[];
  revenueTrends: any[];
  appointmentMetrics: any;
  performanceKPIs: any;
  predictiveInsights: any[];
}

export class AnalyticsService {
  static async getAdvancedAnalytics(tenantId: string, dateRange: { start: Date; end: Date }): Promise<AnalyticsData> {
    const [patientTrends, revenueTrends, appointmentMetrics, performanceKPIs] = await Promise.all([
      this.getPatientTrends(tenantId, dateRange),
      this.getRevenueTrends(tenantId, dateRange),
      this.getAppointmentMetrics(tenantId, dateRange),
      this.getPerformanceKPIs(tenantId, dateRange)
    ]);

    const predictiveInsights = await this.getPredictiveInsights(tenantId);

    return {
      patientTrends,
      revenueTrends,
      appointmentMetrics,
      performanceKPIs,
      predictiveInsights
    };
  }

  private static async getPatientTrends(tenantId: string, dateRange: { start: Date; end: Date }) {
    const query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as new_patients,
        COUNT(*) OVER (ORDER BY DATE_TRUNC('day', created_at)) as cumulative_patients
      FROM patients 
      WHERE tenant_id = :tenantId 
        AND created_at BETWEEN :start AND :end
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `;

    return sequelize.query(query, {
      replacements: { tenantId, start: dateRange.start, end: dateRange.end },
      type: QueryTypes.SELECT
    });
  }

  private static async getRevenueTrends(tenantId: string, dateRange: { start: Date; end: Date }) {
    const query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        SUM(amount) as daily_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM payments 
      WHERE tenant_id = :tenantId 
        AND status = 'completed'
        AND created_at BETWEEN :start AND :end
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `;

    return sequelize.query(query, {
      replacements: { tenantId, start: dateRange.start, end: dateRange.end },
      type: QueryTypes.SELECT
    });
  }

  private static async getAppointmentMetrics(tenantId: string, dateRange: { start: Date; end: Date }) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(duration_minutes) as avg_duration,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM appointments 
      WHERE tenant_id = :tenantId 
        AND appointment_date BETWEEN :start AND :end
      GROUP BY status
    `;

    return sequelize.query(query, {
      replacements: { tenantId, start: dateRange.start, end: dateRange.end },
      type: QueryTypes.SELECT
    });
  }

  private static async getPerformanceKPIs(tenantId: string, dateRange: { start: Date; end: Date }) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM patients WHERE tenant_id = :tenantId) as total_patients,
        (SELECT COUNT(*) FROM appointments WHERE tenant_id = :tenantId AND appointment_date BETWEEN :start AND :end) as total_appointments,
        (SELECT SUM(amount) FROM payments WHERE tenant_id = :tenantId AND status = 'completed' AND created_at BETWEEN :start AND :end) as total_revenue,
        (SELECT COUNT(*) FROM appointments WHERE tenant_id = :tenantId AND status = 'completed' AND appointment_date BETWEEN :start AND :end) * 100.0 / 
        NULLIF((SELECT COUNT(*) FROM appointments WHERE tenant_id = :tenantId AND appointment_date BETWEEN :start AND :end), 0) as completion_rate
    `;

    const result = await sequelize.query(query, {
      replacements: { tenantId, start: dateRange.start, end: dateRange.end },
      type: QueryTypes.SELECT
    });

    return result[0];
  }

  private static async getPredictiveInsights(tenantId: string) {
    // Simplified predictive insights - in production, this would use ML models
    return [
      {
        type: 'patient_growth',
        prediction: 'Expected 15% increase in patient registrations next month',
        confidence: 0.78,
        recommendation: 'Consider increasing staff capacity'
      },
      {
        type: 'revenue_forecast',
        prediction: 'Revenue likely to reach $45,000 next month',
        confidence: 0.82,
        recommendation: 'On track to meet quarterly targets'
      }
    ];
  }

  static async getRealtimeMetrics(tenantId: string) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM appointments WHERE tenant_id = :tenantId AND appointment_date = CURRENT_DATE AND status = 'in_progress') as active_appointments,
        (SELECT COUNT(*) FROM patients WHERE tenant_id = :tenantId AND created_at >= CURRENT_DATE) as new_patients_today,
        (SELECT SUM(amount) FROM payments WHERE tenant_id = :tenantId AND created_at >= CURRENT_DATE AND status = 'completed') as revenue_today,
        (SELECT COUNT(*) FROM appointments WHERE tenant_id = :tenantId AND appointment_date = CURRENT_DATE + INTERVAL '1 day') as appointments_tomorrow
    `;

    const result = await sequelize.query(query, {
      replacements: { tenantId },
      type: QueryTypes.SELECT
    });

    return result[0];
  }
}