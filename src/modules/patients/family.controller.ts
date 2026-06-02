import { Request, Response } from 'express';
import { familyService } from '@modules/patients/family.service';

import { ResponseUtil } from '@utils/response.util';

const familyController = {
  createMember: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!userId) return ResponseUtil.unauthorized(res);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const member = await familyService.createMember({ ...req.body, user_id: userId, tenant_id: tenantId });
      return ResponseUtil.success(res, member, 'Family member added successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to add family member', 500, [msg]);
    }
  },

  getAllMembers: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!userId) return ResponseUtil.unauthorized(res);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const members = await familyService.getAllMembers(userId, tenantId);
      return ResponseUtil.success(res, members, 'Family members retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve family members', 500, [msg]);
    }
  },

  getMemberById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) return ResponseUtil.unauthorized(res);

      const member = await familyService.getMemberById(id, userId);
      return ResponseUtil.success(res, member, 'Family member retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Family member not found') return ResponseUtil.notFound(res, 'Family member not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve family member', 500, [msg]);
    }
  },

  updateMember: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) return ResponseUtil.unauthorized(res);

      const member = await familyService.updateMember(id, userId, req.body);
      return ResponseUtil.success(res, member, 'Family member updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Family member not found') return ResponseUtil.notFound(res, 'Family member not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update family member', 500, [msg]);
    }
  },

  deleteMember: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) return ResponseUtil.unauthorized(res);

      await familyService.deleteMember(id, userId);
      return ResponseUtil.success(res, null, 'Family member removed successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Family member not found') return ResponseUtil.notFound(res, 'Family member not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to remove family member', 500, [msg]);
    }
  }
};

export default familyController;
