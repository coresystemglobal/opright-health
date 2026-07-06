import { Request, Response } from 'express';
import { hospitalService } from '@modules/hospital/hospital.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const hospitalController = {
  getAllHospitals: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page = '1', limit = '10', q, city, state } = req.query;
      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };
      const result = await hospitalService.getAllHospitals(paginationQuery, q as string, city as string, state as string);
      return ResponseUtil.paginated(res, result.hospitals, result.count, result.page, result.limit, 'Hospitals retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve hospitals', 500, [msg]);
    }
  },

  getHospitalById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const hospital = await hospitalService.getHospitalById(id);
      return ResponseUtil.success(res, hospital, 'Hospital retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Hospital not found') return ResponseUtil.notFound(res, 'Hospital not found');
      if (error instanceof Error && error.message === 'Invalid hospital ID format') return ResponseUtil.validationError(res, ['Invalid hospital ID format']);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve hospital', 500, [msg]);
    }
  },

  createHospital: async (req: Request, res: Response): Promise<Response> => {
    try {
      const hospital = await hospitalService.createHospital(req.body);
      return ResponseUtil.success(res, hospital, 'Hospital created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in use')) return ResponseUtil.conflict(res, error.message);
      if (error instanceof Error && error.message.includes('Missing required')) return ResponseUtil.validationError(res, [error.message]);
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create hospital', 500, [msg]);
    }
  },

  updateHospital: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const hospital = await hospitalService.updateHospital(id, req.body);
      return ResponseUtil.success(res, hospital, 'Hospital updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Hospital not found') return ResponseUtil.notFound(res, 'Hospital not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update hospital', 500, [msg]);
    }
  },

  deleteHospital: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await hospitalService.deleteHospital(id);
      return ResponseUtil.success(res, null, 'Hospital deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Hospital not found') return ResponseUtil.notFound(res, 'Hospital not found');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete hospital', 500, [msg]);
    }
  },

  toggleStatus: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const result = await hospitalService.toggleHospitalStatus(id);
      const status = result.is_active ? 'activated' : 'deactivated';
      return ResponseUtil.success(res, result, `Hospital ${status} successfully`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Hospital not found') return ResponseUtil.notFound(res, 'Hospital not found');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update hospital status', 500, [msg]);
    }
  }
};

export default hospitalController;
