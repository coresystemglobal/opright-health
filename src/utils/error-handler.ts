import { Response } from 'express';
import { ResponseUtil } from './response.util';

interface ErrorMapping {
  [key: string]: {
    type: 'validation' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict';
    message?: string;
  };
}

const commonErrorMappings: ErrorMapping = {
  // Authentication errors
  'User not authenticated': { type: 'unauthorized' },
  'Current password is incorrect': { type: 'unauthorized' },
  
  // Validation errors
  'Invalid user ID format': { type: 'validation' },
  'Invalid email format': { type: 'validation' },
  'Invalid first name format': { type: 'validation' },
  'Invalid last name format': { type: 'validation' },
  'Invalid phone number format': { type: 'validation' },
  'Invalid role': { type: 'validation' },
  'Current password and new password are required': { type: 'validation' },
  'Search query must be at least 2 characters': { type: 'validation' },
  'Missing required fields': { type: 'validation' },
  
  // Not found errors
  'User not found': { type: 'notFound' },
  
  // Forbidden errors
  'You can only update your own profile': { type: 'forbidden' },
  'Only administrators can change user roles or activation status': { type: 'forbidden' },
  'You cannot delete your own account': { type: 'forbidden' },
  'You cannot deactivate your own account': { type: 'forbidden' },
  
  // Conflict errors
  'User with this email already exists': { type: 'conflict' },
  'Email is already taken': { type: 'conflict' }
};

export class ErrorHandler {
  static handle(error: any, res: Response): Response {
    const message = error.message || error;
    
    // Check for exact matches first
    const exactMatch = commonErrorMappings[message];
    if (exactMatch) {
      return this.sendResponse(res, exactMatch.type, exactMatch.message || message);
    }
    
    // Check for partial matches
    for (const [pattern, mapping] of Object.entries(commonErrorMappings)) {
      if (message.includes(pattern)) {
        return this.sendResponse(res, mapping.type, mapping.message || message);
      }
    }
    
    // Special case for password-related errors
    if (message.includes('Password')) {
      return ResponseUtil.validationError(res, [message]);
    }
    
    // If no mapping found, re-throw the error
    throw error;
  }
  
  private static sendResponse(res: Response, type: string, message: string): Response {
    switch (type) {
      case 'validation':
        return ResponseUtil.validationError(res, [message]);
      case 'unauthorized':
        return ResponseUtil.unauthorized(res, message);
      case 'forbidden':
        return ResponseUtil.forbidden(res, message);
      case 'notFound':
        return ResponseUtil.notFound(res, message);
      case 'conflict':
        return ResponseUtil.conflict(res, message);
      default:
        return ResponseUtil.error(res, message);
    }
  }
}