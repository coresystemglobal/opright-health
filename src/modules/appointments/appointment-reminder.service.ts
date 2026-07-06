import { Op } from 'sequelize';
import { Appointment, Patient, Doctor, User } from '../../models';
import { AppointmentStatus } from '@modules/appointments/appointment.model';
import { Tenant, DEFAULT_REMINDER_SETTINGS } from '@modules/tenancy/tenant.model';
import type { ReminderSettings } from '@modules/tenancy/tenant.model';
import { sendSms } from '@modules/notifications/sms/sms.service';

export interface ReminderResult {
  appointmentId: string;
  /** 'long' = first reminder (default 24h), 'short' = second reminder (default 2h). */
  stage: 'long' | 'short';
  to: string;
  sent: boolean;
  error?: string;
}

const HOUR_MS = 60 * 60 * 1000;

// Only these statuses warrant a reminder
const PENDING_STATUSES = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];

/**
 * Combine a DATEONLY value (string 'YYYY-MM-DD' or Date) with a TIME string
 * ('HH:MM:SS') into a single Date in server-local time.
 */
function toDateTime(appointmentDate: string | Date, appointmentTime: string): Date | null {
  const dateStr = typeof appointmentDate === 'string'
    ? appointmentDate
    : new Date(appointmentDate).toISOString().split('T')[0];
  const timeStr = (appointmentTime || '').length === 5 ? `${appointmentTime}:00` : appointmentTime;
  const dt = new Date(`${dateStr}T${timeStr}`);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatWhen(dt: Date): string {
  return dt.toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function buildMessage(patientName: string, doctorName: string | null, when: string, stage: 'long' | 'short'): string {
  const lead = stage === 'long' ? 'Reminder: you have an upcoming appointment' : 'Reminder: your appointment is coming up soon';
  const withDoctor = doctorName ? ` with Dr. ${doctorName}` : '';
  return `Hi ${patientName}, ${lead}${withDoctor} on ${when}. Please arrive 10 minutes early. Reply to reschedule.`;
}

function doctorDisplayName(doctor: any): string | null {
  const u = doctor?.user;
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

/**
 * Send appointment reminders for pending appointments entering the long and
 * short reminder windows.
 *
 * Per-tenant configurable (Tenant.reminder_settings): reminders can be
 * disabled, and the long/short lead hours adjusted. Patients who set
 * sms_opt_out are skipped entirely.
 *
 * Idempotent via reminder_24h_sent_at (long) / reminder_2h_sent_at (short):
 * each stage fires at most once per appointment regardless of cron cadence,
 * lead-time config, or restarts.
 */
export async function runReminderCycle(): Promise<ReminderResult[]> {
  const now = new Date();
  const results: ReminderResult[] = [];

  // Effective reminder settings resolved once per tenant per cycle
  const settingsCache = new Map<string, Required<ReminderSettings>>();
  const resolveSettings = async (tenantId: string): Promise<Required<ReminderSettings>> => {
    if (settingsCache.has(tenantId)) return settingsCache.get(tenantId)!;
    const tenant = await Tenant.findByPk(tenantId).catch(() => null);
    const effective = tenant ? tenant.effective_reminder_settings : { ...DEFAULT_REMINDER_SETTINGS };
    settingsCache.set(tenantId, effective);
    return effective;
  };

  // Bound the candidate set to appointments dated today..+2 days that still
  // need at least one reminder.
  const todayStr = now.toISOString().split('T')[0];
  const inTwoDays = new Date(now.getTime() + 2 * 24 * HOUR_MS).toISOString().split('T')[0];

  const appointments = await Appointment.findAll({
    where: {
      status: { [Op.in]: PENDING_STATUSES },
      appointment_date: { [Op.between]: [todayStr, inTwoDays] },
      [Op.or]: [
        { reminder_24h_sent_at: { [Op.is]: null } },
        { reminder_2h_sent_at: { [Op.is]: null } }
      ]
    },
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'phone', 'tenant_id', 'sms_opt_out'] },
      { model: Doctor, as: 'doctor', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }
    ]
  });

  for (const appt of appointments) {
    const dt = toDateTime(appt.appointment_date as any, appt.appointment_time);
    if (!dt || dt <= now) continue; // past or unparseable — skip

    const patient: any = (appt as any).patient;
    if (!patient) continue;

    // Respect patient opt-out
    if (patient.sms_opt_out) continue;

    // Respect per-tenant config
    const settings = await resolveSettings(patient.tenant_id);
    if (!settings.enabled) continue;

    const longMs = settings.long_lead_hours * HOUR_MS;
    const shortMs = settings.short_lead_hours * HOUR_MS;
    const msUntil = dt.getTime() - now.getTime();

    // Determine which stage (if any) is due now
    let stage: 'long' | 'short' | null = null;
    if (msUntil <= shortMs && !appt.reminder_2h_sent_at) {
      stage = 'short';
    } else if (msUntil <= longMs && msUntil > shortMs && !appt.reminder_24h_sent_at) {
      stage = 'long';
    }
    if (!stage) continue;

    const phone = patient.phone;
    const patientName = `${patient.first_name || ''}`.trim() || 'there';
    const doctorName = doctorDisplayName((appt as any).doctor);
    const sentColumn = stage === 'short' ? { reminder_2h_sent_at: now } : { reminder_24h_sent_at: now };

    // No phone on file — mark the stage handled so we don't re-scan forever
    if (!phone) {
      await appt.update(sentColumn);
      results.push({ appointmentId: appt.id, stage, to: '', sent: false, error: 'No patient phone on file' });
      continue;
    }

    const message = buildMessage(patientName, doctorName, formatWhen(dt), stage);
    const smsResult = await sendSms({ to: phone, message });

    // Stamp the sentinel on success OR permanent no-provider failure, so a
    // misconfigured gateway doesn't cause infinite retries every cycle.
    if (smsResult.success || smsResult.error === 'No SMS provider is configured') {
      await appt.update(sentColumn);
    }

    results.push({
      appointmentId: appt.id,
      stage,
      to: phone,
      sent: smsResult.success,
      error: smsResult.success ? undefined : smsResult.error
    });
  }

  return results;
}
