import { Request, Response } from 'express';
import { UserRole } from '../models';
import { AuthenticatedRequest, PaginationQuery } from '../types/common.types';
import { ResponseUtil } from '../utils/response.util';
import { ErrorHandler } from '../utils/error-handler';
import { userService } from '../services';
import { userValidation, genericValidation } from '../utils/validator';



export class UserController {

  static async getAllUsers(req: Request, res: Response) {
    try {
      const queryData = genericValidation.pagination.validate(req.query, {abortEarly: false}).value;
      const result = await userService.getAllUsers(queryData, queryData.search, queryData.sort_by, queryData.order);
      
      return ResponseUtil.paginated(
        res,
        result.users,
        result.count,
        result.page,
        result.limit,
        'Users retrieved successfully'
      );
    } catch (error) {
      console.error('Get all users error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve users');
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = genericValidation.id.validate(req.params, {abortEarly: false}).value;
      
      try {
        const user = await userService.getUserById(id);
        return ResponseUtil.success(res, user, 'User retrieved successfully');
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Get user by ID error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user');
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const userData = userValidation.register.validate(req.body, {abortEarly: false}).value;
      
      try {
        const userResponse = await userService.createUser(userData);
        return ResponseUtil.success(res, userResponse, 'User created successfully', 201);
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Create user error:', error);
      return ResponseUtil.error(res, 'Failed to create user');
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = genericValidation.id.validate(req.params, {abortEarly: false}).value;
      const updates = userValidation.update.validate(req.body, {abortEarly: false}).value;
      const currentUserId = (req as any).user?.userId;
      const currentUserRole = (req as any).user?.role;

      try {
        const userResponse = await userService.updateUser(
          id, 
          updates, 
          currentUserId || '', 
          currentUserRole || ''
        );
        return ResponseUtil.success(res, userResponse, 'User updated successfully');
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Update user error:', error);
      return ResponseUtil.error(res, 'Failed to update user');
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = genericValidation.id.validate(req.params, {abortEarly: false}).value;
      const currentUserId = (req as any).user?.userId;

      try {
        await userService.deleteUser(id, currentUserId || '');
        return ResponseUtil.success(res, null, 'User deleted successfully');
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Delete user error:', error);
      return ResponseUtil.error(res, 'Failed to delete user');
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const { current_password, new_password } = userValidation.changePassword.validate(req.body, {abortEarly: false}).value;
      const userId = (req as any).user?.userId;

      try {
        await userService.changePassword({
          userId: userId || '',
          current_password,
          new_password
        });
        return ResponseUtil.success(res, null, 'Password changed successfully');
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Change password error:', error);
      return ResponseUtil.error(res, 'Failed to change password');
    }
  }



  static async searchUsers(req: Request, res: Response) {
    try {
      const queryData = genericValidation.search.validate(req.query, {abortEarly: false}).value;
      
      try {
        const result = await userService.searchUsers({
          query: queryData.q || '',
          role: (req.query as any).role,
          is_active: (req.query as any).is_active,
          pagination: queryData
        });
        
        return ResponseUtil.paginated(
          res,
          result.users,
          result.count,
          result.page,
          result.limit,
          'Users found successfully'
        );
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Search users error:', error);
      return ResponseUtil.error(res, 'Failed to search users');
    }
  }

  static async toggleUserStatus(req: Request, res: Response) {
    try {
      const { id } = genericValidation.id.validate(req.params, {abortEarly: false}).value;
      const currentUserId = (req as any).user?.userId;

      try {
        const result = await userService.toggleUserStatus(id, currentUserId || '');
        const action = result.is_active ? 'activated' : 'deactivated';
        return ResponseUtil.success(res, { is_active: result.is_active }, `User ${action} successfully`);
      } catch (serviceError: any) {
        return ErrorHandler.handle(serviceError, res);
      }
    } catch (error) {
      console.error('Toggle user status error:', error);
      return ResponseUtil.error(res, 'Failed to update user status');
    }
  }
}