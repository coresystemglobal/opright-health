import { Request } from 'express';
import { Patient } from '@modules/patients/patient.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { NotificationService, NotificationType } from '@modules/notifications/notification.service';

import sequelize from '@core/database';
import { QueryTypes } from 'sequelize';

interface MobileAppointment {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  department: string;
  status: string;
  canCancel: boolean;
  canReschedule: boolean;
}

interface MobilePatientProfile {
  id: string;
  name: string;
  dateOfBirth: string;
  phone?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  upcomingAppointments: number;
  lastVisit?: string;
}

export class MobileAPIService {
  // Mobile routes receive req.user.userId (the auth user id), but appointments
  // are keyed by patients.id. Resolve the patient from the user id so every
  // mobile read/write targets the patient record consistently.
  private static async resolvePatient(userId: string, tenantId?: string): Promise<Patient> {
    const where: any = tenantId ? { user_id: userId, tenant_id: tenantId } : { user_id: userId };
    const patient = await Patient.findOne({ where });
    if (!patient) throw new Error('Patient not found');
    return patient;
  }

  static async getPatientProfile(userId: string, tenantId: string): Promise<MobilePatientProfile> {
    const patient = await this.resolvePatient(userId, tenantId);

    const upcomingAppointments = await Appointment.count({
      where: {
        patient_id: patient.id,
        appointment_date: { $gte: new Date() },
        status: ['scheduled', 'confirmed']
      }
    });

    const lastAppointment = await Appointment.findOne({
      where: {
        patient_id: patient.id,
        status: 'completed'
      },
      order: [['appointment_date', 'DESC']]
    });

    return {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      dateOfBirth: String(patient.date_of_birth).slice(0, 10),
      phone: patient.phone,
      email: patient.email,
      emergencyContact: patient.emergency_contact_name ? {
        name: patient.emergency_contact_name,
        phone: patient.emergency_contact_phone || ''
      } : undefined,
      upcomingAppointments,
      lastVisit: lastAppointment ? String(lastAppointment.appointment_date).slice(0, 10) : undefined
    };
  }

  static async getUpcomingAppointments(userId: string, tenantId: string): Promise<MobileAppointment[]> {
    const patient = await this.resolvePatient(userId, tenantId);
    const appointments = await Appointment.findAll({
      where: {
        patient_id: patient.id,
        appointment_date: { $gte: new Date() },
        status: ['scheduled', 'confirmed']
      },
      include: ['doctor'],
      order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']],
      limit: 10
    });

    return appointments.map(apt => ({
      id: apt.id,
      date: String(apt.appointment_date).slice(0, 10),
      time: apt.appointment_time,
      doctorName: apt.doctor ? `Dr. ${(apt.doctor as any).first_name} ${(apt.doctor as any).last_name}` : 'Unknown',
      department: apt.doctor?.specialization || 'General',
      status: apt.status,
      canCancel: apt.can_be_cancelled,
      canReschedule: apt.can_be_rescheduled
    }));
  }

  static async cancelAppointment(appointmentId: string, userId: string, reason?: string): Promise<void> {
    const patient = await this.resolvePatient(userId);
    const appointment = await Appointment.findOne({
      where: { id: appointmentId, patient_id: patient.id }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (!appointment.can_be_cancelled) {
      throw new Error('Appointment cannot be cancelled');
    }

    await appointment.cancel(userId, reason);

    // Send notification
    await NotificationService.sendNotification({
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Appointment Cancelled',
      message: `Your appointment on ${appointment.appointment_date} has been cancelled`,
      tenantId: (appointment as any).tenant_id || '',
      userId: patient.id
    });
  }

  static async requestAppointment(
    userId: string,
    tenantId: string,
    appointmentData: {
      doctorId: string;
      preferredDate: string;
      preferredTime: string;
      reason: string;
    }
  ): Promise<{ success: boolean; message: string; appointmentId?: string }> {
    try {
      const patient = await this.resolvePatient(userId, tenantId);

      // Check doctor availability (simplified)
      const existingAppointment = await Appointment.findOne({
        where: {
          doctor_id: appointmentData.doctorId,
          appointment_date: appointmentData.preferredDate,
          appointment_time: appointmentData.preferredTime,
          status: ['scheduled', 'confirmed']
        }
      });

      if (existingAppointment) {
        return {
          success: false,
          message: 'Selected time slot is not available'
        };
      }

      // Create appointment request (pending approval)
      const appointment = await Appointment.create({
        patient_id: patient.id,
        doctor_id: appointmentData.doctorId,
        appointment_date: new Date(appointmentData.preferredDate),
        appointment_time: appointmentData.preferredTime,
        chief_complaint: appointmentData.reason,
        status: 'scheduled',
        tenant_id: tenantId,
        created_by: userId
      });

      // Notify staff
      await NotificationService.sendNotification({
        type: NotificationType.SYSTEM_ALERT,
        title: 'New Appointment Request',
        message: `Patient has requested an appointment for ${appointmentData.preferredDate}`,
        tenantId,
        data: { appointmentId: appointment.id }
      });

      return {
        success: true,
        message: 'Appointment request submitted successfully',
        appointmentId: appointment.id
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  static async getLabResults(userId: string, tenantId: string): Promise<any[]> {
    const patient = await this.resolvePatient(userId, tenantId);
    // Simplified lab results for mobile
    const results = await sequelize.query(`
      SELECT 
        tr.id,
        lt.test_name,
        tr.value,
        tr.units,
        tr.reference_range,
        tr.status,
        tr.result_date,
        CASE 
          WHEN tr.is_critical THEN 'critical'
          WHEN tr.status = 'abnormal' THEN 'abnormal'
          ELSE 'normal'
        END as result_status
      FROM test_results tr
      JOIN test_orders tor ON tr.test_order_id = tor.id
      JOIN lab_tests lt ON tr.test_id = lt.id
      WHERE tor.patient_id = :patientId 
        AND tor.tenant_id = :tenantId
      ORDER BY tr.result_date DESC
      LIMIT 20
    `, {
      replacements: { patientId: patient.id, tenantId },
      type: QueryTypes.SELECT
    });

    return results;
  }

  static detectMobileDevice(req: Request): boolean {
    const userAgent = req.get('User-Agent') || '';
    return /Mobile|Android|iPhone|iPad/.test(userAgent);
  }

  static formatMobileResponse(data: any, req: Request) {
    if (this.detectMobileDevice(req)) {
      // Simplified response for mobile
      return {
        ...data,
        _mobile: true,
        _timestamp: new Date().toISOString()
      };
    }
    return data;
  }
}