import { Appointment, Patient, Doctor, User } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateAppointmentData {
  patient_id: string;
  doctor_id: string;
  appointment_date: Date;
  reason_for_visit: string;
  notes?: string;
  status?: string; // 'pending', 'scheduled', 'completed', 'cancelled'
  appointment_type?: string;
}

interface UpdateAppointmentData {
  doctor_id?: string;
  appointment_date?: Date;
  reason_for_visit?: string;
  notes?: string;
  status?: string;
  appointment_type?: string;
}

export const appointmentService = {
  getAllAppointments: async (paginationQuery: PaginationQuery, status?: string, date?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build filter conditions
      const whereConditions: any = {};
      
      if (status) {
        whereConditions.status = status;
      }

      if (date) {
        const appointmentDate = new Date(date);
        const nextDay = new Date(appointmentDate);
        nextDay.setDate(appointmentDate.getDate() + 1);
        
        whereConditions.appointment_date = {
          $gte: appointmentDate,
          $lt: nextDay
        };
      }

      const { count, rows: appointments } = await Appointment.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            model: Doctor,
            as: 'doctor',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          }
        ],
        order: [['appointment_date', 'ASC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        appointments,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all appointments error:', error);
      throw error;
    }
  },

  getAppointmentById: async (appointmentId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(appointmentId)) {
        throw new Error('Invalid appointment ID format');
      }

      const appointment = await Appointment.findByPk(appointmentId, {
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            model: Doctor,
            as: 'doctor',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          }
        ]
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      return appointment;
    } catch (error) {
      console.error('Get appointment by ID error:', error);
      throw error;
    }
  },

  getPatientAppointments: async (patientId: string, paginationQuery: PaginationQuery, status?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build filter conditions
      const whereConditions: any = {
        patient_id: patientId
      };
      
      if (status) {
        whereConditions.status = status;
      }

      const { count, rows: appointments } = await Appointment.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Doctor,
            as: 'doctor',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          }
        ],
        order: [['appointment_date', 'ASC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        appointments,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get patient appointments error:', error);
      throw error;
    }
  },

  getDoctorAppointments: async (doctorId: string, paginationQuery: PaginationQuery, status?: string, date?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build filter conditions
      const whereConditions: any = {
        doctor_id: doctorId
      };
      
      if (status) {
        whereConditions.status = status;
      }

      if (date) {
        const appointmentDate = new Date(date);
        const nextDay = new Date(appointmentDate);
        nextDay.setDate(appointmentDate.getDate() + 1);
        
        whereConditions.appointment_date = {
          $gte: appointmentDate,
          $lt: nextDay
        };
      }

      const { count, rows: appointments } = await Appointment.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          }
        ],
        order: [['appointment_date', 'ASC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        appointments,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get doctor appointments error:', error);
      throw error;
    }
  },

  createAppointment: async (appointmentData: CreateAppointmentData) => {
    try {
      const { 
        patient_id, 
        doctor_id, 
        appointment_date, 
        reason_for_visit,
        notes,
        status,
        appointment_type
      } = appointmentData;

      if (!patient_id || !doctor_id || !appointment_date || !reason_for_visit) {
        throw new Error('Patient ID, doctor ID, appointment date, and reason for visit are required');
      }

      if (!ValidationUtil.isValidUUID(patient_id)) {
        throw new Error('Invalid patient ID format');
      }

      if (!ValidationUtil.isValidUUID(doctor_id)) {
        throw new Error('Invalid doctor ID format');
      }

      // Validate appointment date is in the future
      const now = new Date();
      if (new Date(appointment_date) < now) {
        throw new Error('Appointment date must be in the future');
      }

      // Check for conflicting appointments for the doctor
      const doctorAppointments = await Appointment.findAll({
        where: {
          doctor_id,
          appointment_date: appointment_date,
          status: ['pending', 'scheduled']
        }
      });

      if (doctorAppointments.length > 0) {
        throw new Error('Doctor already has an appointment at this time');
      }

      const appointment = await Appointment.create({
        patient_id,
        doctor_id,
        appointment_date,
        reason_for_visit,
        notes: notes || '',
        status: status || 'pending',
        appointment_type: appointment_type || 'in-person'
      });

      // Notify patient + doctor (non-fatal)
      const { notifyAppointmentEvent } = await import('@modules/appointments/appointment-notifications.service');
      notifyAppointmentEvent(appointment.id, 'booked').catch(() => {});

      return appointment;
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
  },

  updateAppointment: async (appointmentId: string, updateData: UpdateAppointmentData) => {
    try {
      if (!ValidationUtil.isValidUUID(appointmentId)) {
        throw new Error('Invalid appointment ID format');
      }

      const appointment = await Appointment.findByPk(appointmentId);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Validate doctor ID if provided
      if (updateData.doctor_id && !ValidationUtil.isValidUUID(updateData.doctor_id)) {
        throw new Error('Invalid doctor ID format');
      }

      // Validate appointment date is in the future if provided
      if (updateData.appointment_date) {
        const now = new Date();
        if (new Date(updateData.appointment_date) < now) {
          throw new Error('Appointment date must be in the future');
        }

        // Check for conflicting appointments for the doctor if date or doctor changes
        const doctorId = updateData.doctor_id || appointment.doctor_id;

        if (updateData.appointment_date !== appointment.appointment_date ||
            updateData.doctor_id !== appointment.doctor_id) {
          const doctorAppointments = await Appointment.findAll({
            where: {
              id: { $ne: appointmentId },
              doctor_id: doctorId,
              appointment_date: updateData.appointment_date,
              status: ['pending', 'scheduled']
            }
          });

          if (doctorAppointments.length > 0) {
            throw new Error('Doctor already has an appointment at this time');
          }
        }
      }

      // A change of date or doctor is a reschedule → notify
      const isReschedule =
        (updateData.appointment_date && updateData.appointment_date !== appointment.appointment_date) ||
        (updateData.doctor_id && updateData.doctor_id !== appointment.doctor_id);

      await appointment.update(updateData);

      if (isReschedule) {
        const { notifyAppointmentEvent } = await import('@modules/appointments/appointment-notifications.service');
        notifyAppointmentEvent(appointment.id, 'rescheduled').catch(() => {});
      }

      return appointment;
    } catch (error) {
      console.error('Update appointment error:', error);
      throw error;
    }
  },

  cancelAppointment: async (appointmentId: string, cancelReason?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(appointmentId)) {
        throw new Error('Invalid appointment ID format');
      }

      const appointment = await Appointment.findByPk(appointmentId);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check if appointment can be cancelled
      if (appointment.status === 'completed') {
        throw new Error('Completed appointments cannot be cancelled');
      }

      if (appointment.status === 'cancelled') {
        throw new Error('Appointment is already cancelled');
      }

      await appointment.update({
        status: 'cancelled',
        notes: cancelReason ? `${appointment.notes} \nCancellation reason: ${cancelReason}` : appointment.notes
      });

      const { notifyAppointmentEvent } = await import('@modules/appointments/appointment-notifications.service');
      notifyAppointmentEvent(appointment.id, 'cancelled').catch(() => {});

      return appointment;
    } catch (error) {
      console.error('Cancel appointment error:', error);
      throw error;
    }
  },

  completeAppointment: async (appointmentId: string, notes?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(appointmentId)) {
        throw new Error('Invalid appointment ID format');
      }

      const appointment = await Appointment.findByPk(appointmentId);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check if appointment can be completed
      if (appointment.status === 'cancelled') {
        throw new Error('Cancelled appointments cannot be completed');
      }

      if (appointment.status === 'completed') {
        throw new Error('Appointment is already completed');
      }

      await appointment.update({
        status: 'completed',
        notes: notes ? `${appointment.notes} \nCompletion notes: ${notes}` : appointment.notes
      });

      return appointment;
    } catch (error) {
      console.error('Complete appointment error:', error);
      throw error;
    }
  },

  deleteAppointment: async (appointmentId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(appointmentId)) {
        throw new Error('Invalid appointment ID format');
      }

      const appointment = await Appointment.findByPk(appointmentId);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Soft delete
      await appointment.destroy();

      return true;
    } catch (error) {
      console.error('Delete appointment error:', error);
      throw error;
    }
  },

  /**
   * Check doctor availability for a specific date and time
   */
  checkDoctorAvailability: async (doctorId: string, appointmentDate: Date, appointmentTime: string, duration: number = 30, excludeAppointmentId?: string) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      // Get doctor details to check working hours and days
      const doctor = await Doctor.findByPk(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Check if doctor is available
      if (!doctor.is_available) {
        return {
          available: false,
          reason: 'Doctor is not currently available'
        };
      }

      // Check if it's a working day
      const dayOfWeek = appointmentDate.getDay();
      if (!doctor.working_days?.includes(dayOfWeek)) {
        return {
          available: false,
          reason: 'Doctor does not work on this day'
        };
      }

      // Check working hours
      if (!doctor.isWithinWorkingHours(appointmentTime)) {
        return {
          available: false,
          reason: 'Appointment time is outside doctor working hours'
        };
      }

      // Calculate appointment end time
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

      // Check for conflicting appointments
      const whereConditions: any = {
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        status: ['scheduled', 'confirmed', 'in_progress']
      };

      if (excludeAppointmentId) {
        whereConditions.id = { $ne: excludeAppointmentId };
      }

      const conflictingAppointments = await Appointment.findAll({
        where: whereConditions
      });

      // Check for time conflicts
      for (const appointment of conflictingAppointments) {
        const existingStart = appointment.appointment_time;
        const existingEnd = appointment.end_time;

        // Check if times overlap
        if ((appointmentTime < existingEnd && endTime > existingStart)) {
          return {
            available: false,
            reason: 'Doctor has a conflicting appointment at this time',
            conflictingAppointment: {
              id: appointment.id,
              time: existingStart,
              duration: appointment.duration_minutes
            }
          };
        }
      }

      return {
        available: true,
        reason: 'Doctor is available for this time slot'
      };
    } catch (error) {
      console.error('Check doctor availability error:', error);
      throw error;
    }
  },

  /**
   * Get available time slots for a doctor on a specific date
   */
  getDoctorAvailableSlots: async (doctorId: string, date: Date, duration: number = 30) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const doctor = await Doctor.findByPk(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      if (!doctor.is_available) {
        return {
          availableSlots: [],
          message: 'Doctor is not currently available'
        };
      }

      // Check if it's a working day
      const dayOfWeek = date.getDay();
      if (!doctor.working_days?.includes(dayOfWeek)) {
        return {
          availableSlots: [],
          message: 'Doctor does not work on this day'
        };
      }

      // Get all possible time slots
      const allSlots = doctor.getAvailableTimeSlots(date);

      // Get existing appointments for the day
      const existingAppointments = await Appointment.findAll({
        where: {
          doctor_id: doctorId,
          appointment_date: date,
          status: ['scheduled', 'confirmed', 'in_progress']
        },
        order: [['appointment_time', 'ASC']]
      });

      // Filter out conflicting slots
      const availableSlots = allSlots.filter(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

        // Check against existing appointments
        return !existingAppointments.some(appointment => {
          const existingStart = appointment.appointment_time;
          const existingEnd = appointment.end_time;
          return (slot < existingEnd && endTime > existingStart);
        });
      });

      return {
        availableSlots,
        workingHours: {
          start: doctor.working_hours_start,
          end: doctor.working_hours_end
        },
        slotDuration: duration,
        date: date.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Get doctor available slots error:', error);
      throw error;
    }
  },

  /**
   * Get doctor schedule for a date range
   */
  getDoctorSchedule: async (doctorId: string, startDate: Date, endDate: Date) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const doctor = await Doctor.findByPk(doctorId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name', 'email']
        }]
      });

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Get appointments in the date range
      const appointments = await Appointment.findAll({
        where: {
          doctor_id: doctorId,
          appointment_date: {
            $gte: startDate,
            $lte: endDate
          },
          status: ['scheduled', 'confirmed', 'in_progress', 'completed']
        },
        include: [{
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'mrn'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['email', 'phone']
          }]
        }],
        order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']]
      });

      // Group appointments by date
      const schedule: any = {};
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        
        schedule[dateStr] = {
          date: dateStr,
          dayOfWeek,
          isWorkingDay: doctor.working_days?.includes(dayOfWeek) || false,
          workingHours: doctor.working_days?.includes(dayOfWeek) ? {
            start: doctor.working_hours_start,
            end: doctor.working_hours_end
          } : null,
          appointments: appointments.filter(apt => 
            String(apt.appointment_date).slice(0, 10) === dateStr
          ),
          totalAppointments: 0,
          availableSlots: []
        };

        schedule[dateStr].totalAppointments = schedule[dateStr].appointments.length;
        
        // Calculate available slots if it's a working day
        if (schedule[dateStr].isWorkingDay && doctor.is_available) {
          const availableSlots = await appointmentService.getDoctorAvailableSlots(doctorId, currentDate);
          schedule[dateStr].availableSlots = availableSlots.availableSlots;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        doctor: {
          id: doctor.id,
          name: doctor.full_name,
          specialization: doctor.specialization,
          isAvailable: doctor.is_available
        },
        schedule,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('Get doctor schedule error:', error);
      throw error;
    }
  }
};