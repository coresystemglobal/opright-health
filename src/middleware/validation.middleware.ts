import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util';

/**
 * Centralized validation middleware
 * This middleware can be used to validate requests before they reach the controller
 * It delegates validation to service methods
 */
export const validate = (validationFn: (data: any) => Promise<any> | any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Combine query params, body, and URL params for validation
      const dataToValidate = {
        ...req.query,
        ...req.body,
        ...req.params
      };

      // Call the validation function provided
      await validationFn(dataToValidate);
      
      // If validation passes, proceed to controller
      return next();
    } catch (error: any) {
      // If validation fails, send a validation error response
      if (error.name === 'ValidationError') {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      // For other errors, pass to error handler middleware
      return next(error);
    }
  };
};