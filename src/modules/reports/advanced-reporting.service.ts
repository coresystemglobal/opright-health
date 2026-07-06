import sequelize from '@core/database';
import { QueryTypes } from 'sequelize';
import PDFDocument from 'pdfkit';
// import ExcelJS from 'exceljs'; // Package not installed

interface ReportFilter {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  departmentId?: string;
  doctorId?: string;
  patientId?: string;
  [key: string]: any;
}

interface ReportData {
  title: string;
  data: any[];
  summary?: any;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    filters: ReportFilter;
  };
}

export class AdvancedReportingService {
  static async generatePatientOutcomeReport(filters: ReportFilter): Promise<ReportData> {
    const query = `
      SELECT 
        p.id,
        p.first_name || ' ' || p.last_name as patient_name,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        AVG(CASE WHEN a.status = 'completed' THEN a.duration_minutes END) as avg_duration,
        COUNT(DISTINCT a.doctor_id) as unique_doctors
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id
      WHERE p.tenant_id = :tenantId
        AND a.appointment_date BETWEEN :startDate AND :endDate
      GROUP BY p.id, p.first_name, p.last_name
      ORDER BY total_appointments DESC
    `;

    const data = await sequelize.query(query, {
      replacements: filters,
      type: QueryTypes.SELECT
    });

    return {
      title: 'Patient Outcome Report',
      data,
      summary: {
        totalPatients: data.length,
        avgAppointmentsPerPatient: data.reduce((sum: number, row: any) => sum + row.total_appointments, 0) / data.length
      },
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'system',
        filters
      }
    };
  }

  static async generateRevenueReport(filters: ReportFilter): Promise<ReportData> {
    const query = `
      SELECT 
        DATE_TRUNC('day', p.created_at) as payment_date,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_revenue,
        AVG(p.amount) as avg_transaction,
        p.payment_provider,
        p.status
      FROM payments p
      WHERE p.tenant_id = :tenantId
        AND p.created_at BETWEEN :startDate AND :endDate
      GROUP BY DATE_TRUNC('day', p.created_at), p.payment_provider, p.status
      ORDER BY payment_date DESC
    `;

    const data = await sequelize.query(query, {
      replacements: filters,
      type: QueryTypes.SELECT
    });

    const totalRevenue = data.reduce((sum: number, row: any) => sum + parseFloat(row.total_revenue), 0);

    return {
      title: 'Revenue Report',
      data,
      summary: {
        totalRevenue,
        totalTransactions: data.reduce((sum: number, row: any) => sum + row.transaction_count, 0),
        avgDailyRevenue: totalRevenue / Math.max(1, data.length)
      },
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'system',
        filters
      }
    };
  }

  static async generateOperationalReport(filters: ReportFilter): Promise<ReportData> {
    const query = `
      SELECT 
        d.first_name || ' ' || d.last_name as doctor_name,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        AVG(a.duration_minutes) as avg_duration,
        SUM(a.consultation_fee) as total_revenue
      FROM doctors d
      LEFT JOIN appointments a ON d.id = a.doctor_id
      WHERE d.tenant_id = :tenantId
        AND a.appointment_date BETWEEN :startDate AND :endDate
      GROUP BY d.id, d.first_name, d.last_name
      ORDER BY total_appointments DESC
    `;

    const data = await sequelize.query(query, {
      replacements: filters,
      type: QueryTypes.SELECT
    });

    return {
      title: 'Operational Performance Report',
      data,
      summary: {
        totalDoctors: data.length,
        totalAppointments: data.reduce((sum: number, row: any) => sum + row.total_appointments, 0),
        avgCompletionRate: data.reduce((sum: number, row: any) => 
          sum + (row.completed_appointments / Math.max(1, row.total_appointments)), 0) / data.length
      },
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'system',
        filters
      }
    };
  }

  static async exportToPDF(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text(reportData.title, 50, 50);
      doc.fontSize(12).text(`Generated: ${reportData.metadata.generatedAt.toISOString()}`, 50, 80);

      // Summary
      if (reportData.summary) {
        doc.fontSize(14).text('Summary', 50, 120);
        let yPos = 140;
        Object.entries(reportData.summary).forEach(([key, value]) => {
          doc.fontSize(10).text(`${key}: ${value}`, 50, yPos);
          yPos += 15;
        });
      }

      // Data table (simplified)
      let finalYPos = 140;
      if (reportData.summary) {
        finalYPos = 140 + Object.keys(reportData.summary).length * 15;
      }
      doc.fontSize(12).text('Data', 50, finalYPos + 20);
      doc.fontSize(8).text(JSON.stringify(reportData.data.slice(0, 10), null, 2), 50, finalYPos + 40);

      doc.end();
    });
  }

  static async exportToExcel(reportData: ReportData): Promise<Buffer> {
    // Simplified CSV export since ExcelJS is not installed
    const csvData = [];
    
    // Add headers
    if (reportData.data.length > 0) {
      const headers = Object.keys(reportData.data[0]);
      csvData.push(headers.join(','));
      
      // Add data
      reportData.data.forEach(row => {
        const values = Object.values(row).map(val => `"${val}"`);
        csvData.push(values.join(','));
      });
    }
    
    return Buffer.from(csvData.join('\n'), 'utf-8');
  }
}