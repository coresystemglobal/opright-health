import { Response } from 'express';
import { AuthenticatedRequest, TypedRequest } from '@appTypes/common.types';
import { ResponseUtil } from '@utils/response.util';
import { authService } from '../../services';

// Request interfaces
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export class AuthController {
  
  /**
   * User login
   */
  static async login(req: TypedRequest<LoginRequest>, res: Response) {
    try {
      try {
        const result = await authService.login(req.body);
        if ((result as any).requiresTwoFactor) {
          return ResponseUtil.success(res, result, '2FA verification required');
        }
        return ResponseUtil.success(res, result, 'Login successful');
      } catch (serviceError: any) {
        if (serviceError.message === 'Email and password are required' ||
            serviceError.message === 'Invalid email format') {
          return ResponseUtil.validationError(res, [serviceError.message]);
        } else if (serviceError.message === 'Invalid credentials') {
          return ResponseUtil.unauthorized(res, 'Invalid credentials');
        } else if (serviceError.message === 'Account is deactivated') {
          return ResponseUtil.forbidden(res, 'Account is deactivated');
        } else if (serviceError.message === 'Account is temporarily locked') {
          return ResponseUtil.forbidden(res, 'Account is temporarily locked');
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      return ResponseUtil.error(res, 'Login failed');
    }
  }

  /**
   * User registration
   */
  static async register(req: TypedRequest<RegisterRequest>, res: Response) {
    try {
      try {
        const result = await authService.register(req.body);
        return ResponseUtil.success(res, result, 'Registration successful. Please verify your email.', 201);
      } catch (serviceError: any) {
        if (serviceError.message.includes('Missing required fields') ||
            serviceError.message === 'Invalid email format' ||
            serviceError.message.includes('Password') ||
            serviceError.message === 'Invalid first name format' ||
            serviceError.message === 'Invalid last name format' ||
            serviceError.message === 'Invalid phone number format') {
          return ResponseUtil.validationError(res, [serviceError.message]);
        } else if (serviceError.message === 'User with this email already exists') {
          return ResponseUtil.conflict(res, 'User with this email already exists');
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      return ResponseUtil.error(res, 'Registration failed');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: TypedRequest<RefreshTokenRequest>, res: Response) {
    try {
      try {
        const result = await authService.refreshToken(req.body.refreshToken);
        return ResponseUtil.success(res, result, 'Token refreshed successfully');
      } catch (serviceError: any) {
        if (serviceError.message === 'Refresh token is required' ||
            serviceError.message === 'Invalid refresh token' ||
            serviceError.message === 'Refresh token has been revoked' ||
            serviceError.message === 'User not found' ||
            serviceError.message === 'Account is deactivated') {
          return ResponseUtil.unauthorized(res, 'Invalid refresh token');
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      return ResponseUtil.error(res, 'Token refresh failed');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      try {
        const user = await authService.getProfile(userId || '');
        return ResponseUtil.success(res, user, 'Profile retrieved successfully');
      } catch (serviceError: any) {
        if (serviceError.message === 'User not authenticated') {
          return ResponseUtil.unauthorized(res, 'User not authenticated');
        } else if (serviceError.message === 'User not found') {
          return ResponseUtil.notFound(res, 'User not found');
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Get profile error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve profile');
    }
  }

  /**
   * Logout (server-side token revocation)
   */
  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const refreshToken = req.body?.refresh_token as string | undefined;
      const result = await authService.logout(refreshToken);
      return ResponseUtil.success(res, null, result.message);
    } catch (error) {
      console.error('Logout error:', error);
      return ResponseUtil.error(res, 'Logout failed');
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req: TypedRequest<ForgotPasswordRequest>, res: Response) {
    try {
      try {
        const result = await authService.forgotPassword(req.body);
        return ResponseUtil.success(res, null, result.message);
      } catch (serviceError: any) {
        if (serviceError.message === 'Email is required' ||
            serviceError.message === 'Invalid email format') {
          return ResponseUtil.validationError(res, [serviceError.message]);
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return ResponseUtil.error(res, 'Failed to process forgot password request');
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: TypedRequest<ResetPasswordRequest>, res: Response) {
    try {
      try {
        const result = await authService.resetPassword({
          token: req.body.token,
          newPassword: req.body.newPassword
        });
        return ResponseUtil.success(res, null, result.message);
      } catch (serviceError: any) {
        if (serviceError.message === 'Token and new password are required' ||
            serviceError.message.includes('Password')) {
          return ResponseUtil.validationError(res, [serviceError.message]);
        } else if (serviceError.message === 'Invalid or expired token' ||
                   serviceError.message === 'Token has expired') {
          return ResponseUtil.unauthorized(res, serviceError.message);
        } else if (serviceError.message === 'User not found') {
          return ResponseUtil.notFound(res, 'User not found');
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      return ResponseUtil.error(res, 'Failed to reset password');
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: TypedRequest<{ token: string }>, res: Response) {
    try {
      try {
        const result = await authService.verifyEmail({
          token: req.body.token
        });
        return ResponseUtil.success(res, { verified: result.verified }, result.message);
      } catch (serviceError: any) {
        if (serviceError.message === 'Verification token is required') {
          return ResponseUtil.validationError(res, ['Verification token is required']);
        } else if (serviceError.message === 'Invalid or expired verification token') {
          return ResponseUtil.unauthorized(res, 'Invalid or expired verification token');
        } else if (serviceError.message === 'User not found') {
          return ResponseUtil.notFound(res, 'User not found');
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Email verification error:', error);
      return ResponseUtil.error(res, 'Failed to verify email');
    }
  }
}