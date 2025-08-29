import { User, UserRole } from '../models';
import bcrypt from 'bcryptjs';
import { PaginationQuery } from '../types/common.types';
import { PaginationUtil } from '../utils/pagination.util';
import { ValidationUtil } from '../utils/validation.util';

interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
}

interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
}

interface ChangePasswordData {
  userId: string;
  current_password: string;
  new_password: string;
}

interface SearchUsersParams {
  query: string;
  role?: string;
  is_active?: string;
  pagination: PaginationQuery;
}

export const userService = {
  getAllUsers: async (paginationQuery: PaginationQuery, search?: string, sort_by?: string, order?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build search conditions
      const searchConditions = search ? PaginationUtil.buildSearchConditions(
        search,
        ['first_name', 'last_name', 'email', 'phone']
      ) : {};

      // Build sort options
      const sortOptions = PaginationUtil.parseSortOptions(
        sort_by,
        order as 'ASC' | 'DESC' | undefined,
        ['first_name', 'last_name', 'email', 'role', 'created_at', 'is_active']
      ) as [string, string][]; // Ensure correct type for Sequelize

      const { count, rows: users } = await User.findAndCountAll({
        where: searchConditions,
        attributes: { exclude: ['password'] },
        order: sortOptions,
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        users,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  },

  getUserById: async (userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  },

  createUser: async (userData: CreateUserData) => {
    try {
      const { first_name, last_name, email, password, phone, role } = userData;

      // Validate required fields
      const requiredFields = ['first_name', 'last_name', 'email', 'password', 'role'];
      const missingFields = ValidationUtil.validateRequiredFields(userData, requiredFields);
      
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

      // Validate role
      if (!ValidationUtil.isValidEnumValue(role, UserRole)) {
        throw new Error('Invalid role');
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
        role,
        verified: true, // Admin-created users are auto-verified
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
        is_active: user.is_active,
        created_at: user.createdAt
      };

      return userResponse;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  updateUser: async (userId: string, updates: UpdateUserData, currentUserId: string, currentUserRole: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Check permissions - users can only update their own profile unless they're admin
      if (currentUserId !== userId && currentUserRole !== 'admin') {
        throw new Error('You can only update your own profile');
      }

      // Only admins can change roles and activation status
      if ((updates.role || updates.is_active !== undefined) && currentUserRole !== 'admin') {
        throw new Error('Only administrators can change user roles or activation status');
      }

      // Validate updates
      if (updates.email && !ValidationUtil.isValidEmail(updates.email)) {
        throw new Error('Invalid email format');
      }

      if (updates.first_name && !ValidationUtil.isValidName(updates.first_name)) {
        throw new Error('Invalid first name format');
      }

      if (updates.last_name && !ValidationUtil.isValidName(updates.last_name)) {
        throw new Error('Invalid last name format');
      }

      if (updates.phone && !ValidationUtil.isValidPhoneNumber(updates.phone)) {
        throw new Error('Invalid phone number format');
      }

      if (updates.role && !ValidationUtil.isValidEnumValue(updates.role, UserRole)) {
        throw new Error('Invalid role');
      }

      // Check if email is already taken by another user
      if (updates.email && updates.email.toLowerCase() !== user.email) {
        const existingUser = await User.findOne({ 
          where: { email: updates.email.toLowerCase() }
        });
        
        if (existingUser && existingUser.id !== user.id) {
          throw new Error('Email is already taken');
        }
      }

      // Clean and apply updates
      const cleanedUpdates = ValidationUtil.cleanObject(updates);
      
      if (cleanedUpdates.email) {
        cleanedUpdates.email = cleanedUpdates.email.toLowerCase();
      }

      await user.update(cleanedUpdates);

      // Remove password from response
      const userResponse = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        verified: user.verified,
        is_active: user.is_active,
        updated_at: user.updatedAt
      };

      return userResponse;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  deleteUser: async (userId: string, currentUserId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      // Prevent self-deletion
      if (currentUserId === userId) {
        throw new Error('You cannot delete your own account');
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Soft delete
      await user.destroy();

      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  changePassword: async (changePasswordData: ChangePasswordData) => {
    try {
      const { userId, current_password, new_password } = changePasswordData;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Validate input
      if (!current_password || !new_password) {
        throw new Error('Current password and new password are required');
      }

      // Validate new password strength
      const passwordValidation = ValidationUtil.validatePassword(new_password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      // Update password
      user.password = hashedPassword;
      user.password_changed_at = new Date();
      await user.save();

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  getUserRoles: async () => {
    try {
      const roles = Object.values(UserRole).map(role => ({
        value: role,
        label: role.charAt(0).toUpperCase() + role.slice(1)
      }));

      return roles;
    } catch (error) {
      console.error('Get user roles error:', error);
      throw error;
    }
  },

  searchUsers: async (params: SearchUsersParams) => {
    try {
      const { query, role, is_active, pagination } = params;
      const paginationOptions = PaginationUtil.parsePaginationQuery(pagination);

      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      // Build search conditions
      const searchConditions: any = {
        ...PaginationUtil.buildSearchConditions(
          query,
          ['first_name', 'last_name', 'email', 'phone']
        )
      };

      // Add filters
      if (role) {
        searchConditions.role = role;
      }

      if (is_active !== undefined) {
        searchConditions.is_active = is_active === 'true';
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: searchConditions,
        attributes: { exclude: ['password'] },
        order: [['first_name', 'ASC'], ['last_name', 'ASC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions)
      });

      return {
        users,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  },

  toggleUserStatus: async (userId: string, currentUserId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      // Prevent self-deactivation
      if (currentUserId === userId) {
        throw new Error('You cannot deactivate your own account');
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Toggle status
      user.is_active = !user.is_active;
      await user.save();

      return {
        is_active: user.is_active
      };
    } catch (error) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  }
};