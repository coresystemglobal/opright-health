import { Role, Permission, User, RolePermission } from '../../models';
import { RoleType } from '@modules/rbac/role.model';

import { ValidationUtil } from '@utils/validation.util';
import { PaginationUtil } from '@utils/pagination.util';
import { PaginationQuery } from '@appTypes/common.types';

export const roleService = {
  getAllRoles: async (paginationQuery: PaginationQuery) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      const { count, rows: roles } = await Role.findAndCountAll({
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }],
        order: [['role', 'ASC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions)
      });

      return {
        roles,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all roles error:', error);
      throw error;
    }
  },

  getRoleById: async (roleId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(roleId)) {
        throw new Error('Invalid role ID format');
      }

      const role = await Role.findByPk(roleId, {
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      });

      if (!role) {
        throw new Error('Role not found');
      }

      return role;
    } catch (error) {
      console.error('Get role by ID error:', error);
      throw error;
    }
  },

  createRole: async (roleData: { role: RoleType; description?: string }) => {
    try {
      const { role, description } = roleData;

      if (!role) {
        throw new Error('Role is required');
      }

      const existingRole = await Role.findOne({ where: { role } });
      if (existingRole) {
        throw new Error('Role already exists');
      }

      const newRole = await Role.create({
        role,
        description
      });

      return newRole;
    } catch (error) {
      console.error('Create role error:', error);
      throw error;
    }
  },

  assignPermissions: async (roleId: string, permissionIds: string[]) => {
    try {
      if (!ValidationUtil.isValidUUID(roleId)) {
        throw new Error('Invalid role ID format');
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      const permissions = await Permission.findAll({
        where: { id: permissionIds }
      });

      if (permissions.length !== permissionIds.length) {
        throw new Error('Some permissions not found');
      }

      await role.$set('permissions', permissions);
      return role;
    } catch (error) {
      console.error('Assign permissions error:', error);
      throw error;
    }
  },

  removePermissions: async (roleId: string, permissionIds: string[]) => {
    try {
      if (!ValidationUtil.isValidUUID(roleId)) {
        throw new Error('Invalid role ID format');
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      await RolePermission.destroy({
        where: {
          role_id: roleId,
          permission_id: permissionIds
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Remove permissions error:', error);
      throw error;
    }
  },

  getRolePermissions: async (roleId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(roleId)) {
        throw new Error('Invalid role ID format');
      }

      const role = await Role.findByPk(roleId, {
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      });

      if (!role) {
        throw new Error('Role not found');
      }

      return role.permissions || [];
    } catch (error) {
      console.error('Get role permissions error:', error);
      throw error;
    }
  },

  getUsersByRole: async (roleId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(roleId)) {
        throw new Error('Invalid role ID format');
      }

      const users = await User.findAll({
        where: { role_id: roleId },
        attributes: ['id', 'first_name', 'last_name', 'email', 'is_active']
      });

      return users;
    } catch (error) {
      console.error('Get users by role error:', error);
      throw error;
    }
  },

  assignRoleToUser: async (userId: string, roleId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId) || !ValidationUtil.isValidUUID(roleId)) {
        throw new Error('Invalid user or role ID format');
      }

      const user = await User.findByPk(userId);
      const role = await Role.findByPk(roleId);

      if (!user || !role) {
        throw new Error('User or role not found');
      }

      user.role_id = roleId;
      await user.save();
      return { success: true };
    } catch (error) {
      console.error('Assign role to user error:', error);
      throw error;
    }
  },

  seedDefaultRoles: async () => {
    try {
      const defaultRoles = [
        { role: RoleType.VISITOR, description: 'Visitor with limited access' },
        { role: RoleType.PATIENT, description: 'Patient with access to own records' },
        { role: RoleType.DOCTOR, description: 'Doctor with medical access' },
        { role: RoleType.SECURITY, description: 'Security personnel' },
        { role: RoleType.MANAGER, description: 'Manager with administrative access' },
        { role: RoleType.ADMIN, description: 'Administrator with full access' },
        { role: RoleType.SUPER_ADMIN, description: 'Super administrator with all permissions' }
      ];

      for (const roleData of defaultRoles) {
        const existing = await Role.findOne({ where: { role: roleData.role } });
        if (!existing) {
          await Role.create(roleData);
        }
      }

      return { message: 'Default roles seeded successfully' };
    } catch (error) {
      console.error('Seed roles error:', error);
      throw error;
    }
  }
};