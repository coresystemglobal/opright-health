import { Op } from 'sequelize';
import { Appointment, Patient, Doctor, User } from '../../models';
import { AppointmentStatus } from '@modules/appointments/appointment.model';
import { sendSms } from '@modules/notifications/sms/sms.service';

export interface ReminderResult {
  appointmentId: string;
  stage: '24h' | '2h';
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

function buildMessage(patientName: string, doctorName: string | null, when: string, stage: '24h' | '2h'): string {
  const lead = stage === '24h' ? 'Reminder: you have an appointment tomorrow' : 'Reminder: your appointment is in about 2 hours';
  const withDoctor = doctorName ? ` with Dr. ${doctorName}` : '';
  return `Hi ${patientName}, ${lead}${withDoctor} on ${when}. Please arrive 10 minutes early. Reply to reschedule.`;
}

function doctorDisplayName(doctor: any): string | null {
  const u = doctor?.user;
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

/**
 * Send appointment reminders for pending appointments entering the 24h and
 * 2h windows. Idempotent via reminder_24h_sent_at / reminder_2h_sent_at:
 * each stage fires at most once per appointment regardless of cron cadence
 * or restarts.
 *
 * Threshold model (robust to cron timing):
 *   - 24h reminder: appointment is between 2h and 24h away, not yet sent
 *   - 2h reminder:  appointment is between now and 2h away, not yet sent
 */
export async function runReminderCycle(): Promise<ReminderResult[]> {
  const now = new Date();
  const results: ReminderResult[] = [];

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
      { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'phone'] },
      { model: Doctor, as: 'doctor', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }
    ]
  });

  for (const appt of appointments) {
    const dt = toDateTime(appt.appointment_date as any, appt.appointment_time);
    if (!dt || dt <= now) continue; // past or unparseable — skip

    const msUntil = dt.getTime() - now.getTime();
    const patient: any = (appt as any).patient;
    const phone = patient?.phone;
    const patientName = patient ? `${patient.first_name || ''}`.trim() || 'there' : 'there';
    const doctorName = doctorDisplayName((appt as any).doctor);

    // Determine which stage (if any) is due now
    let stage: '24h' | '2h' | null = null;
    if (msUntil <= 2 * HOUR_MS && !appt.reminder_2h_sent_at) {
      stage = '2h';
    } else if (msUntil <= 24 * HOUR_MS && msUntil > 2 * HOUR_MS && !appt.reminder_24h_sent_at) {
      stage = '24h';
    }
    if (!stage) continue;

    // No phone on file — mark the stage handled so we don't re-scan forever
    if (!phone) {
      await appt.update(stage === '2h' ? { reminder_2h_sent_at: now } : { reminder_24h_sent_at: now });
      results.push({ appointmentId: appt.id, stage, to: '', sent: false, error: 'No patient phone on file' });
      continue;
    }

    const message = buildMessage(patientName, doctorName, formatWhen(dt), stage);
    const smsResult = await sendSms({ to: phone, message });

    // Stamp the sentinel on success OR permanent no-provider failure, so a
    // misconfigured gateway doesn't cause infinite retries every cycle.
    if (smsResult.success || smsResult.error === 'No SMS provider is configured') {
      await appt.update(stage === '2h' ? { reminder_2h_sent_at: now } : { reminder_24h_sent_at: now });
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
