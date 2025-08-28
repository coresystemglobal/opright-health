import { User } from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ValidationUtil } from '../utils/validation.util';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

interface PasswordResetRequest {
  email: string;
}

interface PasswordResetData {
  token: string;
  newPassword: string;
}

interface EmailVerificationData {
  token: string;
}

export const authService = {
  login: async (loginData: LoginData) => {
    try {
      const { email, password } = loginData;

      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Find user
      const user = await User.findOne({ 
        where: { email: email.toLowerCase() },
        paranoid: true // Exclude soft-deleted users
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Check account lockout
      if (user.locked_until && new Date() < user.locked_until) {
        throw new Error('Account is temporarily locked');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.failed_login_attempts >= 5) {
          user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await user.save();
        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      user.failed_login_attempts = 0;
      user.locked_until = null;
      user.last_login_at = new Date();
      await user.save();

      // Generate tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // Remove password from response
      const userResponse = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        verified: user.verified,
        is_active: user.is_active
      };

      return {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (registerData: RegisterData) => {
    try {
      const { first_name, last_name, email, password, phone, role } = registerData;

      // Validate required fields
      const requiredFields = ['first_name', 'last_name', 'email', 'password'];
      const missingFields = ValidationUtil.validateRequiredFields(registerData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = ValidationUtil.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Validate names
      if (!ValidationUtil.isValidName(first_name)) {
        throw new Error('Invalid first name format');
      }

      if (!ValidationUtil.isValidName(last_name)) {
        throw new Error('Invalid last name format');
      }

      // Validate phone if provided
      if (phone && !ValidationUtil.isValidPhoneNumber(phone)) {
        throw new Error('Invalid phone number format');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ 
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone?.trim(),
        role: role || 'patient',
        verified: false,
        is_active: true
      });

      // Remove password from response
      const userResponse = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        verified: user.verified,
        is_active: user.is_active
      };

      // Generate verification token (for email verification)
      const verificationToken = jwt.sign(
        { userId: user.id, purpose: 'email_verification' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      // Send verification email
      try {
        await sendVerificationEmail(user.email, user.first_name, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue registration process even if email sending fails
      }

      return {
        user: userResponse,
        verificationToken
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  refreshToken: async (refreshToken: string) => {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      // Verify refresh token
      const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
      
      if (!decoded || !decoded.userId) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      return {
        accessToken: newAccessToken
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  getProfile: async (userId: string) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  forgotPassword: async (data: PasswordResetRequest) => {
    try {
      const { email } = data;

      if (!email) {
        throw new Error('Email is required');
      }

      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Check if user exists
      const user = await User.findOne({
        where: { email: email.toLowerCase(), is_active: true }
      });

      if (!user) {
        // For security reasons, don't reveal that email doesn't exist
        return {
          message: 'If your email exists in our system, you will receive a password reset link shortly.'
        };
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Save token hash in database
      user.reset_token = resetToken;
      user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Send password reset email
      await sendPasswordResetEmail(user.email, user.first_name, resetToken);

      return {
        message: 'If your email exists in our system, you will receive a password reset link shortly.'
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (resetData: PasswordResetData) => {
    try {
      const { token, newPassword } = resetData;

      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }

      // Validate password strength
      const passwordValidation = ValidationUtil.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Verify token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      
      if (!decoded || !decoded.userId || decoded.purpose !== 'password_reset') {
        throw new Error('Invalid or expired token');
      }

      // Find user
      const user = await User.findByPk(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify token against stored token and check expiration
      if (user.reset_token !== token) {
        throw new Error('Invalid or expired token');
      }

      if (user.reset_token_expires && new Date() > user.reset_token_expires) {
        throw new Error('Token has expired');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      user.password = hashedPassword;
      user.password_changed_at = new Date();
      user.reset_token = null;
      user.reset_token_expires = null;
      await user.save();

      return {
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  verifyEmail: async (verificationData: EmailVerificationData) => {
    try {
      const { token } = verificationData;

      if (!token) {
        throw new Error('Verification token is required');
      }

      // Verify token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      
      if (!decoded || !decoded.userId || decoded.purpose !== 'email_verification') {
        throw new Error('Invalid or expired verification token');
      }

      // Find user
      const user = await User.findByPk(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.verified) {
        return {
          message: 'Email is already verified',
          verified: true
        };
      }

      // Update user verification status
      user.verified = true;
      user.verified_at = new Date();
      await user.save();

      return {
        message: 'Email verified successfully',
        verified: true
      };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  logout: async () => {
    // In JWT-based authentication, server-side logout is typically a no-op
    // since tokens are stateless and stored client-side
    // Actual token invalidation would happen on the client by removing the tokens
    
    return {
      message: 'Logged out successfully'
    };
  }
};