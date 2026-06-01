import { Request, Response } from 'express';
import { permissionService } from '../services/permission.service';
import { ResponseUtil } from '../utils/response.util';
import { ErrorHandler } from '../utils/error-handler';

export class PermissionController {
  static async getAllPermissions(req: Request, res: Response) {
    try {
      const permissions = await permissionService.getAllPermissions();
      return ResponseUtil.success(res, permissions, 'Permissions retrieved successfully');
    } catch (error) {
      console.error('Get all permissions error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve permissions');
    }
  }

  static async createPermission(req: Request, res: Response) {
    try {
      const permission = await permissionService.createPermission(req.body);
      return ResponseUtil.success(res, permission, 'Permission created successfully', 201);
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async getPermissionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const permission = await permissionService.getPermissionById(id);
      return ResponseUtil.success(res, permission, 'Permission retrieved successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async updatePermission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const permission = await permissionService.updatePermission(id, req.body);
      return ResponseUtil.success(res, permission, 'Permission updated successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async deletePermission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await permissionService.deletePermission(id);
      return ResponseUtil.success(res, result, 'Permission deleted successfully');
    } catch (serviceError: any) {
      return ErrorHandler.handle(serviceError, res);
    }
  }

  static async seedPermissions(req: Request, res: Response) {
    try {
      const result = await permissionService.seedDefaultPermissions();
      return ResponseUtil.success(res, result, 'Default permissions seeded successfully');
    } catch (error) {
      console.error('Seed permissions error:', error);
      return ResponseUtil.error(res, 'Failed to seed permissions');
    }
  }
}