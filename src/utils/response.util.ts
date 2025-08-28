import { Response } from 'express';
import { ApiResponse } from '../types/common.types';

export class ResponseUtil {
  static success<T = any>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    meta?: any
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      ...(meta && { meta })
    };
    
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    errors?: string[]
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(errors && { errors })
    };
    
    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    errors: string[],
    message: string = 'Validation failed'
  ): Response {
    return ResponseUtil.error(res, message, 400, errors);
  }

  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return ResponseUtil.error(res, message, 404);
  }

  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return ResponseUtil.error(res, message, 401);
  }

  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response {
    return ResponseUtil.error(res, message, 403);
  }

  static conflict(
    res: Response,
    message: string = 'Resource conflict'
  ): Response {
    return ResponseUtil.error(res, message, 409);
  }

  static paginated<T = any>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Data retrieved successfully'
  ): Response {
    const totalPages = Math.ceil(total / limit);
    
    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    return ResponseUtil.success(res, data, message, 200, meta);
  }
}