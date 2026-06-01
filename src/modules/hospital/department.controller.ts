import { Request, Response } from 'express';
import { DepartmentService } from '@modules/hospital/department.service';

import { ResponseUtil } from '@utils/response.util';

const departmentController = {
  getAllDepartments: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const activeOnly = req.query.active !== 'false';
      const departments = await DepartmentService.getAllDepartments(tenantId, activeOnly);
      return ResponseUtil.success(res, departments, 'Departments retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve departments', 500, [msg]);
    }
  },

  getDepartmentById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const department = await DepartmentService.getDepartmentById(id);
      if (!department) return ResponseUtil.notFound(res, 'Department not found');
      return ResponseUtil.success(res, department, 'Department retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve department', 500, [msg]);
    }
  },

  createDepartment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const department = await DepartmentService.createDepartment({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, department, 'Department created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create department', 500, [msg]);
    }
  },

  updateDepartment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const department = await DepartmentService.updateDepartment(id, req.body);
      return ResponseUtil.success(res, department, 'Department updated successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update department', 500, [msg]);
    }
  },

  deactivateDepartment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await DepartmentService.deactivateDepartment(id);
      return ResponseUtil.success(res, null, 'Department deactivated successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to deactivate department', 500, [msg]);
    }
  },

  assignStaff: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const { id: department_id } = req.params;
      const assignment = await DepartmentService.assignStaff({ ...req.body, department_id, tenant_id: tenantId });
      return ResponseUtil.success(res, assignment, 'Staff assigned successfully', 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to assign staff', 500, [msg]);
    }
  },

  removeStaff: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { assignmentId } = req.params;
      await DepartmentService.removeStaff(assignmentId);
      return ResponseUtil.success(res, null, 'Staff removed from department successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to remove staff', 500, [msg]);
    }
  },

  getDepartmentStaff: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const staff = await DepartmentService.getDepartmentStaff(id);
      return ResponseUtil.success(res, staff, 'Department staff retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve department staff', 500, [msg]);
    }
  },

  getDepartmentAnalytics: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const analytics = await DepartmentService.getDepartmentAnalytics(id);
      return ResponseUtil.success(res, analytics, 'Department analytics retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve department analytics', 500, [msg]);
    }
  }
};

export default departmentController;
