import { Appointment, Patient, Doctor, User } from '../../models';
import { NotificationType, NotificationChannel } from '@modules/notifications/notification.model';
import { dispatchNotification } from '@modules/notifications/notification-dispatcher.service';

type AppointmentEvent = 'booked' | 'cancelled' | 'rescheduled';

const EVENT_META: Record<AppointmentEvent, { type: NotificationType; patientTitle: string; doctorTitle: string }> = {
  booked: {
    type: NotificationType.APPOINTMENT_BOOKED,
    patientTitle: 'Appointment booked',
    doctorTitle: 'New appointment scheduled'
  },
  cancelled: {
    type: NotificationType.APPOINTMENT_CANCELLED,
    patientTitle: 'Appointment cancelled',
    doctorTitle: 'Appointment cancelled'
  },
  rescheduled: {
    type: NotificationType.APPOINTMENT_RESCHEDULED,
    patientTitle: 'Appointment rescheduled',
    doctorTitle: 'Appointment rescheduled'
  }
};

function whenText(appt: any): string {
  const dateStr = typeof appt.appointment_date === 'string'
    ? appt.appointment_date
    : new Date(appt.appointment_date).toISOString().split('T')[0];
  return appt.appointment_time ? `${dateStr} at ${appt.appointment_time}` : dateStr;
}

/**
 * Notify the patient (their linked user account) and the doctor about an
 * appointment lifecycle event. Best-effort and non-fatal — never blocks or
 * fails the underlying appointment operation.
 */
export async function notifyAppointmentEvent(appointmentId: string, event: AppointmentEvent): Promise<void> {
  try {
    const appt: any = await Appointment.findByPk(appointmentId, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'user_id', 'tenant_id', 'phone', 'email'] },
        { model: Doctor, as: 'doctor', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }] }
      ]
    });
    if (!appt || !appt.patient) return;

    const patient = appt.patient;
    const tenantId = patient.tenant_id;
    const meta = EVENT_META[event];
    const when = whenText(appt);
    const doctorName = appt.doctor?.user
      ? `Dr. ${appt.doctor.user.first_name || ''} ${appt.doctor.user.last_name || ''}`.trim()
      : 'your doctor';
    const data = { appointment_id: appt.id, event };

    // Patient — via their linked user account (mobile app / portal)
    if (patient.user_id) {
      await dispatchNotification({
        tenantId,
        userId: patient.user_id,
        type: meta.type,
        title: meta.patientTitle,
        message: `Your appointment with ${doctorName} on ${when} has been ${event === 'booked' ? 'booked' : event}.`,
        data,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
        // fall back to the patient's own contact details if the user record lacks them
        email: patient.email || undefined,
        phone: patient.phone || undefined
      });
    }

    // Doctor — in-app + push
    const doctorUserId = appt.doctor?.user?.id;
    if (doctorUserId) {
      const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'A patient';
      await dispatchNotification({
        tenantId,
        userId: doctorUserId,
        type: meta.type,
        title: meta.doctorTitle,
        message: `${patientName}'s appointment on ${when} has been ${event === 'booked' ? 'booked' : event}.`,
        data,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH]
      });
    }
  } catch (err) {
    console.error(`notifyAppointmentEvent(${event}) failed:`, err);
  }
}
