import { Op } from 'sequelize';
import { ReportSchedule, User, Tenant } from '../../models';
import {
  ScheduledReportType, ScheduleFormat, ScheduleFrequency
} from '@modules/reports/report-schedule.model';
import { UserRole } from '@modules/users/user.model';
import { reportsService } from '@modules/reports/reports.service';
import {
  flattenFinancial, flattenOperationalMetrics, flattenTrends, flattenInventoryValuation,
  flattenPatientDemographics, flattenDoctorPerformance, flattenAppointmentAnalytics,
  flattenPrescriptionDispensing, flattenWaitlistNoShow, flattenInsuranceClaims,
  renderCsv, renderExcel, renderPdf, FlatReport
} from '@modules/reports/report-export.service';
import { buildTenantDigestHtml } from '@modules/reports/report-scheduler.service';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import sendEmail from '@shared/email/email.service';

interface CreateScheduleData {
  name: string;
  report_type: ScheduledReportType;
  format?: ScheduleFormat;
  frequency?: ScheduleFrequency;
  recipients?: string[];
  params?: Record<string, any>;
  created_by?: string;
  tenant_id: string;
}

const WINDOW_DAYS: Record<ScheduleFrequency, number> = {
  [ScheduleFrequency.DAILY]: 1,
  [ScheduleFrequency.WEEKLY]: 7,
  [ScheduleFrequency.MONTHLY]: 30
};

/** Next run: advance from `from` by the schedule's frequency. */
export function computeNextRun(from: Date, frequency: ScheduleFrequency): Date {
  const d = new Date(from);
  if (frequency === ScheduleFrequency.DAILY) d.setDate(d.getDate() + 1);
  else if (frequency === ScheduleFrequency.WEEKLY) d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** Render a FlatReport as a simple inline HTML table set. */
function flatReportToHtml(report: FlatReport): string {
  const sections = report.sections.map(s => `
    <h3 style="color:#1e3a8a;font-family:Arial,sans-serif">${s.title}</h3>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">
      <tr>${s.headers.map(h => `<th style="text-align:left;padding:6px 10px;border-bottom:2px solid #1e3a8a">${h}</th>`).join('')}</tr>
      ${s.rows.map(r => `<tr>${r.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #eee">${c ?? ''}</td>`).join('')}</tr>`).join('')}
    </table>`).join('');
  return `<div style="max-width:720px;margin:0 auto"><h2 style="color:#1e3a8a;font-family:Arial,sans-serif">${report.reportTitle}</h2>${report.period ? `<p style="color:#666">${report.period}</p>` : ''}${sections}</div>`;
}

/** Fetch a report and flatten it for a schedule (non-digest types). */
async function buildFlatReport(schedule: ReportSchedule, dateRange: { startDate: Date; endDate: Date }): Promise<FlatReport> {
  const p = schedule.params || {};
  switch (schedule.report_type) {
    case ScheduledReportType.FINANCIAL:
      return flattenFinancial(await reportsService.getFinancialReport(dateRange));
    case ScheduledReportType.OPERATIONAL_METRICS:
      return flattenOperationalMetrics(await reportsService.getOperationalMetricsReport(dateRange));
    case ScheduledReportType.TRENDS:
      return flattenTrends(await reportsService.getTrendsReport({
        metric: (p.metric || 'revenue'), period: (p.period || 'daily'), dateRange
      }));
    case ScheduledReportType.INVENTORY_VALUATION:
      return flattenInventoryValuation(await reportsService.getInventoryValuationReport(schedule.tenant_id));
    case ScheduledReportType.PATIENT_DEMOGRAPHICS:
      return flattenPatientDemographics(await reportsService.getPatientDemographicsReport(dateRange));
    case ScheduledReportType.DOCTOR_PERFORMANCE:
      return flattenDoctorPerformance(await reportsService.getDoctorPerformanceReport(dateRange));
    case ScheduledReportType.APPOINTMENT_ANALYTICS:
      return flattenAppointmentAnalytics(await reportsService.getAppointmentAnalyticsReport(dateRange));
    case ScheduledReportType.PRESCRIPTION_DISPENSING:
      return flattenPrescriptionDispensing(await reportsService.getPrescriptionDispensingReport(schedule.tenant_id, dateRange));
    case ScheduledReportType.WAITLIST_NO_SHOW:
      return flattenWaitlistNoShow(await reportsService.getWaitlistNoShowReport(schedule.tenant_id, dateRange));
    case ScheduledReportType.INSURANCE_CLAIMS:
      return flattenInsuranceClaims(await reportsService.getInsuranceClaimsReport(schedule.tenant_id, dateRange));
    default:
      throw new Error(`Report type ${schedule.report_type} has no flat representation`);
  }
}

async function resolveRecipients(schedule: ReportSchedule): Promise<string[]> {
  if (schedule.recipients && schedule.recipients.length) return schedule.recipients;
  const admins = await User.findAll({
    where: { tenant_id: schedule.tenant_id, role: [UserRole.ADMIN, UserRole.SUPER_ADMIN] as any },
    attributes: ['email']
  });
  return (admins as any[]).map(a => a.email).filter(Boolean);
}

/** Generate and email one schedule's report. Returns emails sent. */
async function deliverSchedule(schedule: ReportSchedule): Promise<number> {
  const now = new Date();
  const window = WINDOW_DAYS[schedule.frequency];
  const dateRange = { startDate: new Date(now.getTime() - window * 86400000), endDate: now };

  const recipients = await resolveRecipients(schedule);
  if (recipients.length === 0) return 0;

  const subject = `${schedule.name} — ${now.toISOString().slice(0, 10)}`;
  let html: string;
  let attachments: Array<{ filename: string; content: Buffer | string; contentType?: string }> | undefined;

  if (schedule.report_type === ScheduledReportType.DIGEST) {
    const tenant = await Tenant.findByPk(schedule.tenant_id);
    html = await buildTenantDigestHtml(schedule.tenant_id, (tenant as any)?.name || 'Your hospital', dateRange);
  } else {
    const flat = await buildFlatReport(schedule, dateRange);
    if (schedule.format === ScheduleFormat.HTML) {
      html = flatReportToHtml(flat);
    } else {
      html = `<p style="font-family:Arial,sans-serif">Your scheduled report "${schedule.name}" is attached.</p>`;
      const base = `${schedule.report_type}-${now.toISOString().slice(0, 10)}`;
      if (schedule.format === ScheduleFormat.CSV) {
        attachments = [{ filename: `${base}.csv`, content: renderCsv(flat), contentType: 'text/csv' }];
      } else if (schedule.format === ScheduleFormat.XLSX) {
        attachments = [{ filename: `${base}.xlsx`, content: await renderExcel(flat), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }];
      } else if (schedule.format === ScheduleFormat.PDF) {
        attachments = [{ filename: `${base}.pdf`, content: await renderPdf(flat), contentType: 'application/pdf' }];
      }
    }
  }

  let sent = 0;
  for (const to of recipients) {
    const ok = await sendEmail({ to, subject, text: `Scheduled report: ${schedule.name}`, html, attachments }).catch(() => false);
    if (ok) sent++;
  }
  return sent;
}

export const reportScheduleService = {
  createSchedule: async (data: CreateScheduleData) => {
    const { name, report_type, tenant_id } = data;
    if (!name || !report_type || !tenant_id) throw new Error('name, report_type, and tenant context are required');
    const frequency = data.frequency || ScheduleFrequency.WEEKLY;
    return ReportSchedule.create({
      name,
      report_type,
      format: data.format || ScheduleFormat.HTML,
      frequency,
      recipients: data.recipients && data.recipients.length ? data.recipients : null,
      params: data.params || null,
      is_active: true,
      next_run_at: computeNextRun(new Date(), frequency),
      created_by: data.created_by || null,
      tenant_id
    } as any);
  },

  listSchedules: async (tenantId: string, paginationQuery: PaginationQuery) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const { count, rows: schedules } = await ReportSchedule.findAndCountAll({
      where: { tenant_id: tenantId },
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { schedules, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getScheduleById: async (id: string, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid schedule ID format');
    const schedule = await ReportSchedule.findByPk(id);
    if (!schedule || schedule.tenant_id !== tenantId) throw new Error('Schedule not found');
    return schedule;
  },

  updateSchedule: async (id: string, tenantId: string, update: Partial<CreateScheduleData> & { is_active?: boolean }) => {
    const schedule = await reportScheduleService.getScheduleById(id, tenantId);
    const patch: any = { ...update };
    delete patch.tenant_id;
    // If frequency changes, recompute the next run from now
    if (update.frequency && update.frequency !== schedule.frequency) {
      patch.next_run_at = computeNextRun(new Date(), update.frequency);
    }
    await schedule.update(patch);
    return schedule;
  },

  deleteSchedule: async (id: string, tenantId: string) => {
    const schedule = await reportScheduleService.getScheduleById(id, tenantId);
    await schedule.destroy();
    return true;
  },

  /** Run a schedule immediately (does not change its cadence). */
  runNow: async (id: string, tenantId: string) => {
    const schedule = await reportScheduleService.getScheduleById(id, tenantId);
    const sent = await deliverSchedule(schedule);
    await schedule.update({ last_run_at: new Date(), last_run_status: `manual run: ${sent} email(s) sent` });
    return { sent };
  },

  /**
   * Cron entry point: deliver every active schedule whose next_run_at has
   * passed, then advance its cadence. Best-effort and non-fatal per schedule.
   */
  runDueSchedules: async (): Promise<number> => {
    const now = new Date();
    const due = await ReportSchedule.findAll({
      where: { is_active: true, next_run_at: { [Op.lte]: now } }
    }).catch(() => []);

    let totalSent = 0;
    for (const schedule of due) {
      try {
        const sent = await deliverSchedule(schedule);
        totalSent += sent;
        await schedule.update({
          last_run_at: now,
          last_run_status: `${sent} email(s) sent`,
          next_run_at: computeNextRun(now, schedule.frequency)
        });
      } catch (err: any) {
        await schedule.update({
          last_run_at: now,
          last_run_status: `error: ${err?.message || 'unknown'}`,
          next_run_at: computeNextRun(now, schedule.frequency)
        }).catch(() => null);
        console.error(`Report schedule ${schedule.id} failed:`, err);
      }
    }
    return totalSent;
  }
};
