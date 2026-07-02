import { User, TokenBlacklist } from '../../models';
import { Role } from '@modules/rbac/role.model';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from "jsonwebtoken";
import { Op } from 'sequelize';
import { ValidationUtil } from '@utils/validation.util';
import { sendVerificationEmail, sendPasswordResetEmail } from '@shared/email/email.service';
import { isTotpRequiredRole } from './twofa.service';

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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FATAL: ${name} must be defined in environment variables. Server cannot start without it.`);
  }
  return value;
}

const jwtSecret = () => requireEnv('JWT_SECRET');
const jwtRefreshSecret = () => requireEnv('JWT_REFRESH_SECRET');
const jwtExpiry = (process.env.JWT_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"];
const jwtRefreshExpiry = (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];

const signToken = (payload: object, secret: string, options: SignOptions) => {
  return jwt.sign(payload, secret, options);
};

/**
 * Parse a JWT expiry string (e.g. "15m", "7d", "1h") into milliseconds.
 */
function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] || 60_000);
}

export const authService = {
  login: async (loginData: LoginData) => {
    try {
      const { email, password } = loginData;

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      const user = await User.findOne({
        where: { email: email.toLowerCase() },
        include: [{ model: Role, as: 'role' }],
        paranoid: true
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      if (user.locked_until && new Date() < user.locked_until) {
        throw new Error('Account is temporarily locked');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
        
        if (user.failed_login_attempts >= 5) {
          user.locked_until = new Date(Date.now() + 30 * 60 * 1000);
        }
        
        await user.save();
        throw new Error('Invalid credentials');
      }

      // If this role requires 2FA and the user has it enabled, return a challenge token
      const roleName = (user.role as any)?.role as string | undefined;
      if (roleName && isTotpRequiredRole(roleName) && user.totp_enabled) {
        const tempToken = signToken(
          { userId: user.id, purpose: 'totp_challenge' },
          jwtSecret(),
          { expiresIn: '5m' }
        );
        return { requiresTwoFactor: true, tempToken };
      }

      user.failed_login_attempts = 0;
      user.locked_until = undefined;
      user.last_login_at = new Date();
      await user.save();

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: roleName
      };

      const accessToken = signToken(tokenPayload, jwtSecret(), { expiresIn: jwtExpiry });
      const refreshJti = crypto.randomUUID();
      const refreshToken = signToken(
        { userId: user.id, jti: refreshJti },
        jwtRefreshSecret(),
        { expiresIn: jwtRefreshExpiry }
      );

      const userResponse = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
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

      const requiredFields = ['first_name', 'last_name', 'email', 'password'];
      const missingFields = ValidationUtil.validateRequiredFields(registerData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      const passwordValidation = ValidationUtil.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      if (!ValidationUtil.isValidName(first_name)) {
        throw new Error('Invalid first name format');
      }

      if (!ValidationUtil.isValidName(last_name)) {
        throw new Error('Invalid last name format');
      }

      if (phone && !ValidationUtil.isValidPhoneNumber(phone)) {
        throw new Error('Invalid phone number format');
      }

      const existingUser = await User.findOne({ 
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await User.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone?.trim(),
        verified: false,
        is_active: true
      });

      const userResponse = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        verified: user.verified,
        is_active: user.is_active
      };

      const verificationToken = signToken(
        { userId: user.id, purpose: 'email_verification' },
        jwtSecret(),
        { expiresIn: '24h' }
      );

      try {
        await sendVerificationEmail(user.email, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      return {
        user: userResponse
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

      const decoded: any = jwt.verify(refreshToken, jwtRefreshSecret());
      
      if (!decoded || !decoded.userId) {
        throw new Error('Invalid refresh token');
      }

      // Check if the refresh token has been blacklisted (revoked)
      if (decoded.jti) {
        const blacklisted = await TokenBlacklist.findOne({ where: { jti: decoded.jti } });
        if (blacklisted) {
          throw new Error('Refresh token has been revoked');
        }
      }

      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] },
        include: [{ model: Role, as: 'role' }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: (user.role as any)?.role as string | undefined
      };
      
      const newAccessToken = signToken(tokenPayload, jwtSecret(), { expiresIn: jwtExpiry });

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

      const user = await User.findOne({
        where: { email: email.toLowerCase(), is_active: true }
      });

      if (!user) {
        return {
          message: 'If your email exists in our system, you will receive a password reset link shortly.'
        };
      }

      const resetToken = signToken(
        { userId: user.id, purpose: 'password_reset' },
        jwtSecret(),
        { expiresIn: '1h' }
      );

      user.reset_token = resetToken;
      user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      await sendPasswordResetEmail(user.email, resetToken);

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

      const passwordValidation = ValidationUtil.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const decoded: any = jwt.verify(token, jwtSecret());
      
      if (!decoded || !decoded.userId || decoded.purpose !== 'password_reset') {
        throw new Error('Invalid or expired token');
      }

      const user = await User.findByPk(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.reset_token !== token) {
        throw new Error('Invalid or expired token');
      }

      if (user.reset_token_expires && new Date() > user.reset_token_expires) {
        throw new Error('Token has expired');
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedPassword;
      user.password_changed_at = new Date();
      user.reset_token = undefined;
      user.reset_token_expires = undefined;
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

      const decoded: any = jwt.verify(token, jwtSecret());
      
      if (!decoded || !decoded.userId || decoded.purpose !== 'email_verification') {
        throw new Error('Invalid or expired verification token');
      }

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

      user.verified = true;
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

  logout: async (refreshToken?: string) => {
    if (refreshToken) {
      try {
        // Decode without verification to extract jti/exp even if token is expired
        const decoded: any = jwt.decode(refreshToken);
        if (decoded?.jti && decoded?.userId) {
          const expiresAt = decoded.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + parseExpiryToMs(jwtRefreshExpiry as string));

          await TokenBlacklist.create({
            jti: decoded.jti,
            user_id: decoded.userId,
            token_type: 'refresh',
            expires_at: expiresAt,
          });
        }
      } catch (error) {
        // Log but don't fail logout — the client-side token removal is the primary mechanism
        console.error('Failed to blacklist refresh token on logout:', error);
      }

      // Periodic cleanup of expired blacklist entries (fire-and-forget)
      TokenBlacklist.destroy({ where: { expires_at: { [Op.lt]: new Date() } } })
        .catch(() => {});
    }

    return {
      message: 'Logged out successfully'
    };
  }
};