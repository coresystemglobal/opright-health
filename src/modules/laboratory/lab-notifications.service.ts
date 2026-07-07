import { TestOrder, Patient, Doctor, User } from '../../models';
import { NotificationType, NotificationChannel } from '@modules/notifications/notification.model';
import { dispatchNotification } from '@modules/notifications/notification-dispatcher.service';

/**
 * Notify the patient (linked user account) and the ordering doctor that a lab
 * test order's results are ready. Best-effort and non-fatal.
 */
export async function notifyLabResultReady(orderId: string): Promise<void> {
  try {
    const order: any = await TestOrder.findByPk(orderId, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'user_id', 'tenant_id', 'phone', 'email'] },
        { model: Doctor, as: 'doctor', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }] }
      ]
    });
    if (!order || !order.patient) return;

    const patient = order.patient;
    const tenantId = patient.tenant_id;
    const data = { test_order_id: order.id, type: 'lab_result' };

    // Patient — in-app + push + email (results are important; email gives a durable copy)
    if (patient.user_id) {
      await dispatchNotification({
        tenantId,
        userId: patient.user_id,
        type: NotificationType.LAB_RESULT,
        title: 'Lab results ready',
        message: 'Your lab test results are now available. Please check your portal or contact your care team.',
        data,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
        email: patient.email || undefined,
        phone: patient.phone || undefined
      });
    }

    // Ordering doctor — in-app + push
    const doctorUserId = order.doctor?.user?.id;
    if (doctorUserId) {
      const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'A patient';
      await dispatchNotification({
        tenantId,
        userId: doctorUserId,
        type: NotificationType.LAB_RESULT,
        title: 'Lab results ready',
        message: `Lab results for ${patientName} are ready for review.`,
        data,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH]
      });
    }
  } catch (err) {
    console.error('notifyLabResultReady failed:', err);
  }
}
