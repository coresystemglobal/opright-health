import { Request, Response } from 'express';
import { doctorService } from '@modules/doctors/doctor.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const doctorController = {
  getAllDoctors: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page = '1', limit = '10', q, specialization } = req.query;
      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };
      const result = await doctorService.getAllDoctors(paginationQuery, q as string, specialization as string);
      return ResponseUtil.paginated(res, result.doctors, result.count, result.page, result.limit, 'Doctors retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve doctors', 500, [msg]);
    }
  },

  getDoctorById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const doctor = await doctorService.getDoctorById(id);
      return ResponseUtil.success(res, doctor, 'Doctor retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') return ResponseUtil.notFound(res, 'Doctor not found');
      if (error instanceof Error && error.message === 'Invalid doctor ID format') return ResponseUtil.validationError(res, ['Invalid doctor ID format']);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve doctor', 500, [msg]);
    }
  },

  getMyProfile: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const doctor = await doctorService.getDoctorByUserId(userId);
      return ResponseUtil.success(res, doctor, 'Doctor profile retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) return ResponseUtil.notFound(res, 'Doctor profile not found');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve doctor profile', 500, [msg]);
    }
  },

  createDoctor: async (req: Request, res: Response): Promise<Response> => {
    try {
      const doctor = await doctorService.createDoctor(req.body);
      return ResponseUtil.success(res, doctor, 'Doctor created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) return ResponseUtil.conflict(res, error.message);
      if (error instanceof Error && error.message.includes('already in use')) return ResponseUtil.conflict(res, error.message);
      if (error instanceof Error && error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create doctor', 500, [msg]);
    }
  },

  updateDoctor: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const doctor = await doctorService.updateDoctor(id, req.body);
      return ResponseUtil.success(res, doctor, 'Doctor updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') return ResponseUtil.notFound(res, 'Doctor not found');
      if (error instanceof Error && error.message.includes('already in use')) return ResponseUtil.conflict(res, error.message);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update doctor', 500, [msg]);
    }
  },

  deleteDoctor: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await doctorService.deleteDoctor(id);
      return ResponseUtil.success(res, null, 'Doctor deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') return ResponseUtil.notFound(res, 'Doctor not found');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete doctor', 500, [msg]);
    }
  },

  toggleAvailability: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const result = await doctorService.toggleDoctorStatus(id);
      const status = result.is_available ? 'available' : 'unavailable';
      return ResponseUtil.success(res, result, `Doctor marked as ${status}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Doctor not found') return ResponseUtil.notFound(res, 'Doctor not found');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update doctor availability', 500, [msg]);
    }
  }
};

export default doctorController;
