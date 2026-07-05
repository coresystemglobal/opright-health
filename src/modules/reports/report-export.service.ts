import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

// Clinical Blue design system colours (matches pdf-invoice.service.ts)
const NAVY       = '#1e3a8a';
const SLATE      = '#475569';
const NEAR_BLACK = '#0f172a';
const BORDER     = '#e2e8f0';
const BG_ROW_ALT = '#f8fafc';

/**
 * A report is flattened into one or more titled tables before being
 * rendered. Every exporter (CSV / Excel / PDF) consumes this shape,
 * so adding a new report type only requires a new flattener.
 */
export interface ReportSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface FlatReport {
  reportTitle: string;
  period?: string;
  sections: ReportSection[];
}

// ── Flatteners: one per report type ──────────────────────────────────────────

export function flattenPatientDemographics(data: any): FlatReport {
  return {
    reportTitle: 'Patient Demographics Report',
    sections: [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [['Total Patients', data.totalPatients]]
      },
      {
        title: 'Gender Distribution',
        headers: ['Gender', 'Count'],
        rows: Object.entries(data.genderDistribution || {}).map(([k, v]) => [k, v as number])
      },
      {
        title: 'Age Distribution',
        headers: ['Age Group', 'Count'],
        rows: Object.entries(data.ageDistribution || {}).map(([k, v]) => [k, v as number])
      },
      {
        title: 'Registration Trends (12 months)',
        headers: ['Month', 'Registrations'],
        rows: (data.registrationTrends || []).map((t: any) => [t.month, t.count])
      }
    ]
  };
}

export function flattenDoctorPerformance(data: any): FlatReport {
  return {
    reportTitle: 'Doctor Performance Report',
    sections: [
      {
        title: 'Doctors',
        headers: ['Doctor', 'Specialization', 'Appointments', 'Completed', 'Cancelled', 'Completion %', 'Avg Fee', 'Revenue'],
        rows: (data.doctors || []).map((d: any) => [
          d.doctorName,
          d.specialization,
          d.totalAppointments,
          d.completedAppointments,
          d.cancelledAppointments,
          d.completionRate,
          d.averageConsultationFee,
          d.totalRevenue
        ])
      }
    ]
  };
}

export function flattenFinancial(data: any): FlatReport {
  return {
    reportTitle: 'Financial Summary Report',
    period: data.period,
    sections: [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Revenue', data.totalRevenue],
          ['Total Invoices', data.totalInvoices],
          ['Paid Invoices', data.paidInvoices],
          ['Pending Invoices', data.pendingInvoices],
          ['Overdue Invoices', data.overdueInvoices],
          ['Average Invoice Amount', data.averageInvoiceAmount]
        ]
      },
      {
        title: 'Payment Method Breakdown',
        headers: ['Method', 'Amount', 'Transactions'],
        rows: Object.entries(data.paymentMethodBreakdown || {}).map(([method, v]: [string, any]) => [
          method, v.amount, v.count
        ])
      },
      {
        title: 'Revenue by Doctor',
        headers: ['Doctor', 'Revenue'],
        rows: (data.revenueByDoctor || []).map((d: any) => [d.doctorName, d.revenue])
      }
    ]
  };
}

export function flattenAppointmentAnalytics(data: any): FlatReport {
  return {
    reportTitle: 'Appointment Analytics Report',
    period: data.period,
    sections: [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Appointments', data.totalAppointments],
          ['Scheduled', data.scheduledAppointments],
          ['Completed', data.completedAppointments],
          ['Cancelled', data.cancelledAppointments],
          ['No-shows', data.noShowAppointments],
          ['Completion Rate (%)', data.completionRate],
          ['Cancellation Rate (%)', data.cancellationRate],
          ['Avg Appointments / Day', data.averageAppointmentsPerDay]
        ]
      },
      {
        title: 'Peak Hours',
        headers: ['Hour', 'Appointments'],
        rows: (data.peakHours || []).map((h: any) => [`${h.hour}:00`, h.count])
      },
      {
        title: 'Appointments by Specialization',
        headers: ['Specialization', 'Appointments'],
        rows: (data.appointmentsBySpecialization || []).map((s: any) => [s.specialization, s.count])
      }
    ]
  };
}

// ── Renderers ────────────────────────────────────────────────────────────────

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function renderCsv(report: FlatReport): string {
  const lines: string[] = [csvEscape(report.reportTitle)];
  if (report.period) lines.push(csvEscape(`Period: ${report.period}`));
  lines.push('');

  for (const section of report.sections) {
    lines.push(csvEscape(section.title));
    lines.push(section.headers.map(csvEscape).join(','));
    for (const row of section.rows) {
      lines.push(row.map(csvEscape).join(','));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function renderExcel(report: FlatReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hospital Management System';

  for (const section of report.sections) {
    // Sheet names cap at 31 chars and disallow some characters
    const sheetName = section.title.replace(/[\\/*?:[\]]/g, '').substring(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    const headerRow = sheet.addRow(section.headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    });

    section.rows.forEach(row => sheet.addRow(row));

    sheet.columns.forEach(col => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, cell => {
        max = Math.max(max, String(cell.value ?? '').length + 2);
      });
      col.width = Math.min(max, 40);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function renderPdf(report: FlatReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const pass = new PassThrough();
    const chunks: Buffer[] = [];

    pass.on('data', (chunk: Buffer) => chunks.push(chunk));
    pass.on('end', () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);
    doc.pipe(pass);

    const W = doc.page.width - 100;

    // Header bar
    doc.rect(50, 50, W, 60).fill(NAVY);
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(report.reportTitle, 70, 66);
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(report.period ? `Period: ${report.period}` : `Generated ${new Date().toLocaleDateString('en-GB')}`, 70, 88);

    let y = 135;

    const ensureSpace = (needed: number) => {
      if (y + needed > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }
    };

    for (const section of report.sections) {
      ensureSpace(60);

      doc.font('Helvetica-Bold').fontSize(11).fillColor(NEAR_BLACK).text(section.title, 50, y);
      y += 20;

      const colWidth = W / section.headers.length;

      // Header row
      doc.rect(50, y, W, 18).fill(NAVY);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      section.headers.forEach((h, i) => {
        doc.text(h, 54 + i * colWidth, y + 5, { width: colWidth - 8, ellipsis: true });
      });
      y += 18;

      // Data rows
      section.rows.forEach((row, r) => {
        ensureSpace(16);
        doc.rect(50, y, W, 16).fill(r % 2 === 0 ? '#ffffff' : BG_ROW_ALT);
        doc.font('Helvetica').fontSize(8).fillColor(NEAR_BLACK);
        row.forEach((cell, i) => {
          doc.text(String(cell ?? ''), 54 + i * colWidth, y + 4, { width: colWidth - 8, ellipsis: true });
        });
        y += 16;
      });

      doc.moveTo(50, y).lineTo(50 + W, y).strokeColor(BORDER).stroke();
      y += 24;
    }

    // Footer
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(SLATE)
      .text(
        `Generated on ${new Date().toLocaleString('en-GB')} — Hospital Management System`,
        50,
        doc.page.height - 50,
        { width: W, align: 'center' }
      );

    doc.end();
  });
}
