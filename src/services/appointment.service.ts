import { Appointment } from '../models';
import { PaginationQuery } from '../types/common.types';
import { PaginationUtil } from '../utils/pagination.util';
import { ValidationUtil } from '../utils/validation.util';

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
            model: 'Patient',
            as: 'patient',
            include: [
              {
                model: 'User',
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            model: 'Doctor',
            as: 'doctor',
            include: [
              {
                model: 'User',
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
            model: 'Patient',
            as: 'patient',
            include: [
              {
                model: 'User',
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            model: 'Doctor',
            as: 'doctor',
            include: [
              {
                model: 'User',
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
            model: 'Doctor',
            as: 'doctor',
            include: [
              {
                model: 'User',
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
            model: 'Patient',
            as: 'patient',
            include: [
              {
                model: 'User',
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

      await appointment.update(updateData);

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
  }
};