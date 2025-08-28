import { Request as ExpressRequest, Response } from 'express';
import { appointmentService } from '../services/appointment.service';
import { ResponseUtil } from '../utils/response.util';
import { PaginationQuery } from '../types/common.types';

/**
 * Appointment controller for handling appointment operations
 */
const appointmentController = {
  /**
   * Get all appointments with optional filtering
   */
  getAllAppointments: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { status, date, page = '1', limit = '10' } = req.query;
      
      const paginationQuery: PaginationQuery = {
        page: page as string,
        limit: limit as string
      };

      const result = await appointmentService.getAllAppointments(
        paginationQuery,
        status as string,
        date as string
      );

      return ResponseUtil.success(res, {
        appointments: result.appointments,
        pagination: {
          total: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.count / result.limit)
        }
      }, 'Appointments retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve appointments', 500, [errorMessage]);
    }
  },

  /**
   * Get appointment by ID
   */
  getAppointmentById: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { appointmentId } = req.params;

      if (!appointmentId) {
        return ResponseUtil.validationError(res, ['Appointment ID is required']);
      }

      const appointment = await appointmentService.getAppointmentById(appointmentId);
      
      return ResponseUtil.success(res, appointment, 'Appointment retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        return ResponseUtil.notFound(res, 'Appointment not found');
      }
      
      if (error instanceof Error && error.message === 'Invalid appointment ID format') {
        return ResponseUtil.validationError(res, ['Invalid appointment ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve appointment', 500, [errorMessage]);
    }
  },

  /**
   * Get appointments for a specific patient
   */
  getPatientAppointments: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { status, page = '1', limit = '10' } = req.query;

      if (!patientId) {
        return ResponseUtil.validationError(res, ['Patient ID is required']);
      }

      const paginationQuery: PaginationQuery = {
        page: page as string,
        limit: limit as string
      };

      const result = await appointmentService.getPatientAppointments(
        patientId,
        paginationQuery,
        status as string
      );

      return ResponseUtil.success(res, {
        appointments: result.appointments,
        pagination: {
          total: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.count / result.limit)
        }
      }, 'Patient appointments retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid patient ID format') {
        return ResponseUtil.validationError(res, ['Invalid patient ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve patient appointments', 500, [errorMessage]);
    }
  },

  /**
   * Get appointments for a specific doctor
   */
  getDoctorAppointments: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { doctorId } = req.params;
      const { status, date, page = '1', limit = '10' } = req.query;

      if (!doctorId) {
        return ResponseUtil.validationError(res, ['Doctor ID is required']);
      }

      const paginationQuery: PaginationQuery = {
        page: page as string,
        limit: limit as string
      };

      const result = await appointmentService.getDoctorAppointments(
        doctorId,
        paginationQuery,
        status as string,
        date as string
      );

      return ResponseUtil.success(res, {
        appointments: result.appointments,
        pagination: {
          total: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.count / result.limit)
        }
      }, 'Doctor appointments retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid doctor ID format') {
        return ResponseUtil.validationError(res, ['Invalid doctor ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve doctor appointments', 500, [errorMessage]);
    }
  },

  /**
   * Create a new appointment
   */
  createAppointment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const appointmentData = req.body;
      
      if (!appointmentData.patient_id || !appointmentData.doctor_id || 
          !appointmentData.appointment_date || !appointmentData.reason_for_visit) {
        return ResponseUtil.validationError(res, [
          'Patient ID, doctor ID, appointment date, and reason for visit are required'
        ]);
      }

      const appointment = await appointmentService.createAppointment(appointmentData);
      
      return ResponseUtil.success(res, appointment, 'Appointment created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('required') ||
        error.message.includes('already has an appointment') ||
        error.message.includes('must be in the future')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to create appointment', 500, [errorMessage]);
    }
  },

  /**
   * Update an appointment
   */
  updateAppointment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { appointmentId } = req.params;
      const updateData = req.body;

      if (!appointmentId) {
        return ResponseUtil.validationError(res, ['Appointment ID is required']);
      }

      const appointment = await appointmentService.updateAppointment(appointmentId, updateData);
      
      return ResponseUtil.success(res, appointment, 'Appointment updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        return ResponseUtil.notFound(res, 'Appointment not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('already has an appointment') ||
        error.message.includes('must be in the future')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to update appointment', 500, [errorMessage]);
    }
  },

  /**
   * Cancel an appointment
   */
  cancelAppointment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { appointmentId } = req.params;
      const { reason } = req.body;

      if (!appointmentId) {
        return ResponseUtil.validationError(res, ['Appointment ID is required']);
      }

      const appointment = await appointmentService.cancelAppointment(appointmentId, reason);
      
      return ResponseUtil.success(res, appointment, 'Appointment cancelled successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        return ResponseUtil.notFound(res, 'Appointment not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('cannot be cancelled') ||
        error.message.includes('already cancelled')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to cancel appointment', 500, [errorMessage]);
    }
  },

  /**
   * Complete an appointment
   */
  completeAppointment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { appointmentId } = req.params;
      const { notes } = req.body;

      if (!appointmentId) {
        return ResponseUtil.validationError(res, ['Appointment ID is required']);
      }

      const appointment = await appointmentService.completeAppointment(appointmentId, notes);
      
      return ResponseUtil.success(res, appointment, 'Appointment completed successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        return ResponseUtil.notFound(res, 'Appointment not found');
      }
      
      if (error instanceof Error && (
        error.message.includes('Invalid') || 
        error.message.includes('cannot be completed') ||
        error.message.includes('already completed')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to complete appointment', 500, [errorMessage]);
    }
  },

  /**
   * Delete an appointment (soft delete)
   */
  deleteAppointment: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { appointmentId } = req.params;

      if (!appointmentId) {
        return ResponseUtil.validationError(res, ['Appointment ID is required']);
      }

      await appointmentService.deleteAppointment(appointmentId);
      
      return ResponseUtil.success(res, null, 'Appointment deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        return ResponseUtil.notFound(res, 'Appointment not found');
      }
      
      if (error instanceof Error && error.message === 'Invalid appointment ID format') {
        return ResponseUtil.validationError(res, ['Invalid appointment ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to delete appointment', 500, [errorMessage]);
    }
  },

  /**
   * Check doctor availability for a specific date and time
   */
  checkDoctorAvailability: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { doctorId } = req.params;
      const { date, time, duration = '30', excludeAppointmentId } = req.query;

      if (!doctorId) {
        return ResponseUtil.validationError(res, ['Doctor ID is required']);
      }

      if (!date || !time) {
        return ResponseUtil.validationError(res, ['Date and time are required']);
      }

      const appointmentDate = new Date(date as string);
      const durationMinutes = parseInt(duration as string);
      
      const availability = await appointmentService.checkDoctorAvailability(
        doctorId,
        appointmentDate,
        time as string,
        durationMinutes,
        excludeAppointmentId as string
      );
      
      return ResponseUtil.success(res, availability, 'Doctor availability checked successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') {
        return ResponseUtil.notFound(res, 'Doctor not found');
      }
      
      if (error instanceof Error && error.message === 'Invalid doctor ID format') {
        return ResponseUtil.validationError(res, ['Invalid doctor ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to check doctor availability', 500, [errorMessage]);
    }
  },

  /**
   * Get available time slots for a doctor on a specific date
   */
  getDoctorAvailableSlots: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { doctorId } = req.params;
      const { date, duration = '30' } = req.query;

      if (!doctorId) {
        return ResponseUtil.validationError(res, ['Doctor ID is required']);
      }

      if (!date) {
        return ResponseUtil.validationError(res, ['Date is required']);
      }

      const appointmentDate = new Date(date as string);
      const durationMinutes = parseInt(duration as string);
      
      const slots = await appointmentService.getDoctorAvailableSlots(
        doctorId,
        appointmentDate,
        durationMinutes
      );
      
      return ResponseUtil.success(res, slots, 'Available slots retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') {
        return ResponseUtil.notFound(res, 'Doctor not found');
      }
      
      if (error instanceof Error && error.message === 'Invalid doctor ID format') {
        return ResponseUtil.validationError(res, ['Invalid doctor ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to get available slots', 500, [errorMessage]);
    }
  },

  /**
   * Get doctor schedule for a date range
   */
  getDoctorSchedule: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { doctorId } = req.params;
      const { startDate, endDate } = req.query;

      if (!doctorId) {
        return ResponseUtil.validationError(res, ['Doctor ID is required']);
      }

      if (!startDate || !endDate) {
        return ResponseUtil.validationError(res, ['Start date and end date are required']);
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (start > end) {
        return ResponseUtil.validationError(res, ['Start date must be before end date']);
      }

      // Limit to maximum 30 days
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        return ResponseUtil.validationError(res, ['Date range cannot exceed 30 days']);
      }
      
      const schedule = await appointmentService.getDoctorSchedule(doctorId, start, end);
      
      return ResponseUtil.success(res, schedule, 'Doctor schedule retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') {
        return ResponseUtil.notFound(res, 'Doctor not found');
      }
      
      if (error instanceof Error && error.message === 'Invalid doctor ID format') {
        return ResponseUtil.validationError(res, ['Invalid doctor ID format']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to get doctor schedule', 500, [errorMessage]);
    }
  }
};

export default appointmentController;