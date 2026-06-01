import { Request, Response } from 'express';
import { roleService } from '../services/role.service';
import { ResponseUtil } from '../utils/response.util';
import { ErrorHandler } from '../utils/error-handler';
import { PaginationQuery } from '../types/common.types';

export class RoleController {
  static async getAllRoles(req: Request, res: Response) {
    try {
      const result = await roleService.getAllRoles(req.query as PaginationQuery);
      return ResponseUtil.paginated(
        res,
        result.roles,
        result.count,
        result.page,
        result.limit,
        'Roles retrieved successfully'
      );
    } catch (error) {
      console.error('Get all roles error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve roles');
    }
  }

  static async getRoleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const role = await roleService.getRoleById(id);
      return ResponseUtil.success(res, role, 'Role retrieved successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async createRole(req: Request, res: Response) {
    try {
      const role = await roleService.createRole(req.body);
      return ResponseUtil.success(res, role, 'Role created successfully', 201);
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async assignPermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      
      const role = await roleService.assignPermissions(id, permissionIds);
      return ResponseUtil.success(res, role, 'Permissions assigned successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async assignRoleToUser(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;
      
      const result = await roleService.assignRoleToUser(userId, roleId);
      return ResponseUtil.success(res, result, 'Role assigned to user successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async removePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      
      const result = await roleService.removePermissions(id, permissionIds);
      return ResponseUtil.success(res, result, 'Permissions removed successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async getRolePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const permissions = await roleService.getRolePermissions(id);
      return ResponseUtil.success(res, permissions, 'Role permissions retrieved successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async getUsersByRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const users = await roleService.getUsersByRole(id);
      return ResponseUtil.success(res, users, 'Users retrieved successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async seedRoles(req: Request, res: Response) {
    try {
      const result = await roleService.seedDefaultRoles();
      return ResponseUtil.success(res, result, 'Default roles seeded successfully');
    } catch (error) {
      console.error('Seed roles error:', error);
      return ResponseUtil.error(res, 'Failed to seed roles');
    }
  }
}