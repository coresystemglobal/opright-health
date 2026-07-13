import { Tenant, User } from '../../models';
import { UserRole } from '@modules/users/user.model';
import { TenantStatus } from '@modules/tenancy/tenant.model';
import { reportsService } from '@modules/reports/reports.service';
import sendEmail from '@shared/email/email.service';

const NAVY = '#1e3a8a';
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

function money(n: number | undefined): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n || 0);
}

function digestHtml(tenantName: string, valuation: any, ops: any, revenue: any): string {
  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${value}</td></tr>`;
  const deltaStr = revenue?.summary?.delta_pct != null ? `${revenue.summary.delta_pct}%` : 'n/a';
  return `
  <div style="font-family:${FONT};max-width:640px;margin:0 auto;color:#222">
    <h2 style="color:${NAVY}">Weekly report digest — ${tenantName}</h2>
    <p style="color:#666">Generated ${new Date().toISOString().slice(0, 10)}</p>
    <h3 style="color:${NAVY}">Inventory valuation</h3>
    <table style="width:100%;border-collapse:collapse">
      ${row('Pharmacy (cost)', money(valuation?.pharmacy?.total_cost_value))}
      ${row('Supplies', money(valuation?.supplies?.total_value))}
      ${row('Grand total (cost)', money(valuation?.totals?.grand_total_cost))}
    </table>
    <h3 style="color:${NAVY}">Operations (last 7 days)</h3>
    <table style="width:100%;border-collapse:collapse">
      ${row('Appointments', ops?.appointments?.total ?? 0)}
      ${row('No-show rate', `${ops?.appointments?.no_show_rate ?? 0}%`)}
      ${row('Bed occupancy', `${ops?.beds?.occupancy_rate ?? 0}%`)}
      ${row('Lab avg turnaround', `${ops?.lab_turnaround?.average_hours ?? 0} h`)}
    </table>
    <h3 style="color:${NAVY}">Revenue trend (last 7 days)</h3>
    <table style="width:100%;border-collapse:collapse">
      ${row('Total', money(revenue?.summary?.total))}
      ${row('Prev. period', money(revenue?.summary?.previous_period_total))}
      ${row('Change', deltaStr)}
    </table>
  </div>`;
}

/**
 * Build the multi-section digest HTML for a tenant over a date range.
 * Reused by both the legacy all-tenant digest and configurable schedules.
 */
export async function buildTenantDigestHtml(tenantId: string, tenantName: string, dateRange: { startDate: Date; endDate: Date }): Promise<string> {
  const [valuation, ops, revenue] = await Promise.all([
    reportsService.getInventoryValuationReport(tenantId).catch(() => null),
    reportsService.getOperationalMetricsReport(dateRange).catch(() => null),
    reportsService.getTrendsReport({ metric: 'revenue', period: 'daily', dateRange }).catch(() => null)
  ]);
  return digestHtml(tenantName, valuation, ops, revenue);
}

/**
 * Build a weekly digest per active tenant and email it to that tenant's
 * admins. Best-effort and non-fatal — a failure for one tenant/recipient
 * doesn't stop the rest. Returns the number of emails sent.
 *
 * Superseded by configurable schedules (report-schedule.service) but kept
 * for reuse/testing.
 */
export async function runScheduledReports(): Promise<number> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const dateRange = { startDate: weekAgo, endDate: now };

  const tenants = await Tenant.findAll({ where: { status: TenantStatus.ACTIVE } }).catch(() => []);
  let sent = 0;

  for (const tenant of tenants) {
    try {
      const admins = await User.findAll({
        where: { tenant_id: tenant.id, role: [UserRole.ADMIN, UserRole.SUPER_ADMIN] as any },
        attributes: ['email']
      });
      const recipients = (admins as any[]).map(a => a.email).filter(Boolean);
      if (recipients.length === 0) continue;

      const [valuation, ops, revenue] = await Promise.all([
        reportsService.getInventoryValuationReport(tenant.id).catch(() => null),
        reportsService.getOperationalMetricsReport(dateRange).catch(() => null),
        reportsService.getTrendsReport({ metric: 'revenue', period: 'daily', dateRange }).catch(() => null)
      ]);

      const html = digestHtml((tenant as any).name, valuation, ops, revenue);
      for (const to of recipients) {
        const ok = await sendEmail({
          to,
          subject: `Weekly report digest — ${(tenant as any).name}`,
          text: 'Your weekly hospital report digest is attached (view in an HTML-capable client).',
          html
        }).catch(() => false);
        if (ok) sent++;
      }
    } catch (err) {
      console.error(`Scheduled report failed for tenant ${tenant.id}:`, err);
    }
  }

  return sent;
}
