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

export function flattenInventoryValuation(data: any): FlatReport {
  const catRows = (byCat: Record<string, any>) =>
    Object.entries(byCat || {}).map(([cat, v]: [string, any]) => [cat, v.items, v.quantity, v.value]);
  return {
    reportTitle: 'Inventory Valuation Report',
    sections: [
      {
        title: 'Totals',
        headers: ['Metric', 'Value'],
        rows: [
          ['Pharmacy Cost Value', data.pharmacy?.total_cost_value],
          ['Pharmacy Retail Value', data.pharmacy?.total_retail_value],
          ['Supplies Value', data.supplies?.total_value],
          ['Grand Total (Cost)', data.totals?.grand_total_cost],
          ['Grand Total (Retail)', data.totals?.grand_total_retail]
        ]
      },
      {
        title: 'Pharmacy by Category',
        headers: ['Category', 'Items', 'Quantity', 'Cost Value'],
        rows: catRows(data.pharmacy?.by_category)
      },
      {
        title: 'Supplies by Category',
        headers: ['Category', 'Items', 'Quantity', 'Value'],
        rows: catRows(data.supplies?.by_category)
      }
    ]
  };
}

export function flattenOperationalMetrics(data: any): FlatReport {
  const a = data.appointments || {}, b = data.beds || {}, l = data.lab_turnaround || {};
  return {
    reportTitle: 'Operational Metrics Report',
    period: data.period ? `${data.period.startDate} to ${data.period.endDate}` : undefined,
    sections: [
      {
        title: 'Appointments',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total', a.total],
          ['No-show Rate (%)', a.no_show_rate],
          ['Cancellation Rate (%)', a.cancellation_rate],
          ['Completion Rate (%)', a.completion_rate],
          ['Average Wait (min)', a.average_wait_minutes]
        ]
      },
      {
        title: 'Beds',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Beds', b.total_beds],
          ['Occupied', b.occupied_beds],
          ['Occupancy Rate (%)', b.occupancy_rate],
          ['Admissions', b.admissions_in_period],
          ['Discharges', b.discharges_in_period],
          ['Avg Length of Stay (days)', b.average_length_of_stay_days]
        ]
      },
      {
        title: 'Lab Turnaround',
        headers: ['Metric', 'Value'],
        rows: [
          ['Completed Orders', l.completed_orders],
          ['Average Hours', l.average_hours],
          ['Min Hours', l.min_hours],
          ['Max Hours', l.max_hours]
        ]
      },
      {
        title: 'Doctor Utilization',
        headers: ['Doctor', 'Appointments', 'Completed', 'Booked Minutes', 'Utilization (%)'],
        rows: (data.doctor_utilization || []).map((d: any) => [
          d.doctor_name, d.appointments, d.completed, d.booked_minutes, d.utilization_rate ?? 'n/a'
        ])
      }
    ]
  };
}

export function flattenTrends(data: any): FlatReport {
  const s = data.summary || {};
  return {
    reportTitle: `Trend Report — ${data.metric} (${data.period})`,
    period: data.range ? `${data.range.startDate} to ${data.range.endDate}` : undefined,
    sections: [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total', s.total],
          ['Previous Period Total', s.previous_period_total],
          ['Delta', s.delta],
          ['Delta (%)', s.delta_pct ?? 'n/a']
        ]
      },
      {
        title: 'Series',
        headers: ['Period', 'Value'],
        rows: (data.series || []).map((p: any) => [p.period, p.value])
      }
    ]
  };
}

export function flattenPrescriptionDispensing(data: any): FlatReport {
  const d = data.dispensing || {};
  return {
    reportTitle: 'Prescription & Dispensing Report',
    period: data.period,
    sections: [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Prescriptions', data.total_prescriptions],
          ['Total Items', d.total_items],
          ['Dispensed Items', d.dispensed_items],
          ['Pending Items', d.pending_items],
          ['Item Dispense Rate (%)', d.item_dispense_rate],
          ['Quantity Prescribed', d.quantity_prescribed],
          ['Quantity Dispensed', d.quantity_dispensed],
          ['Quantity Fill Rate (%)', d.quantity_fill_rate],
          ['Fully Dispensed', d.fully_dispensed_prescriptions],
          ['Partially Dispensed', d.partially_dispensed_prescriptions]
        ]
      },
      {
        title: 'Status Breakdown',
        headers: ['Status', 'Count'],
        rows: Object.entries(data.status_breakdown || {}).map(([k, v]) => [k, v as number])
      },
      {
        title: 'Top Medications',
        headers: ['Medication', 'Prescriptions', 'Qty Prescribed', 'Qty Dispensed'],
        rows: (data.top_medications || []).map((m: any) => [m.medication, m.prescriptions, m.quantity_prescribed, m.quantity_dispensed])
      }
    ]
  };
}

export function flattenWaitlistNoShow(data: any): FlatReport {
  const w = data.waitlist || {};
  const a = data.appointments || {};
  return {
    reportTitle: 'Waitlist & No-Show Report',
    period: data.period,
    sections: [
      {
        title: 'Waitlist',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Entries', w.total_entries],
          ['Scheduled From Waitlist', w.scheduled_from_waitlist],
          ['Promotion Rate (%)', w.promotion_rate],
          ['Expired', w.expired]
        ]
      },
      {
        title: 'Waitlist Status Breakdown',
        headers: ['Status', 'Count'],
        rows: Object.entries(w.status_breakdown || {}).map(([k, v]) => [k, v as number])
      },
      {
        title: 'Appointments',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total', a.total],
          ['Completed', a.completed],
          ['Cancelled', a.cancelled],
          ['No-Show', a.no_show],
          ['No-Show Rate (%)', a.no_show_rate],
          ['Cancellation Rate (%)', a.cancellation_rate]
        ]
      }
    ]
  };
}

export function flattenInsuranceClaims(data: any): FlatReport {
  const f = data.financials || {};
  return {
    reportTitle: 'Insurance Claims Report',
    period: data.period,
    sections: [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Claims', data.total_claims],
          ['Total Claimed', f.total_claimed],
          ['Total Approved', f.total_approved],
          ['Approval Rate (%)', f.approval_rate],
          ['Rejection Rate (%)', f.rejection_rate]
        ]
      },
      {
        title: 'Status Breakdown',
        headers: ['Status', 'Count'],
        rows: Object.entries(data.status_breakdown || {}).map(([k, v]) => [k, v as number])
      },
      {
        title: 'Type Breakdown',
        headers: ['Type', 'Count'],
        rows: Object.entries(data.type_breakdown || {}).map(([k, v]) => [k, v as number])
      },
      {
        title: 'By Provider',
        headers: ['Provider', 'Claims', 'Claimed', 'Approved'],
        rows: (data.by_provider || []).map((p: any) => [p.provider, p.claims, p.claimed_amount, p.approved_amount])
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
