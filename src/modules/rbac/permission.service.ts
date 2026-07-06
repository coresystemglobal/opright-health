import { Permission } from '../../models';
import { ValidationUtil } from '@utils/validation.util';

export const permissionService = {
  getAllPermissions: async () => {
    try {
      const permissions = await Permission.findAll({
        order: [['resource', 'ASC'], ['action', 'ASC']]
      });

      return permissions;
    } catch (error) {
      console.error('Get all permissions error:', error);
      throw error;
    }
  },

  getPermissionById: async (id: string) => {
    try {
      if (!ValidationUtil.isValidUUID(id)) {
        throw new Error('Invalid permission ID format');
      }

      const permission = await Permission.findByPk(id);
      if (!permission) {
        throw new Error('Permission not found');
      }

      return permission;
    } catch (error) {
      console.error('Get permission by ID error:', error);
      throw error;
    }
  },

  updatePermission: async (id: string, updateData: { name?: string; resource?: string; action?: string; description?: string }) => {
    try {
      if (!ValidationUtil.isValidUUID(id)) {
        throw new Error('Invalid permission ID format');
      }

      const permission = await Permission.findByPk(id);
      if (!permission) {
        throw new Error('Permission not found');
      }

      if (updateData.name && updateData.name !== permission.name) {
        const existing = await Permission.findOne({ where: { name: updateData.name } });
        if (existing) {
          throw new Error('Permission with this name already exists');
        }
      }

      await permission.update(updateData);
      return permission;
    } catch (error) {
      console.error('Update permission error:', error);
      throw error;
    }
  },

  deletePermission: async (id: string) => {
    try {
      if (!ValidationUtil.isValidUUID(id)) {
        throw new Error('Invalid permission ID format');
      }

      const permission = await Permission.findByPk(id);
      if (!permission) {
        throw new Error('Permission not found');
      }

      await permission.destroy();
      return { success: true };
    } catch (error) {
      console.error('Delete permission error:', error);
      throw error;
    }
  },

  createPermission: async (permissionData: { name: string; resource: string; action: string; description?: string }) => {
    try {
      const { name, resource, action, description } = permissionData;

      if (!name || !resource || !action) {
        throw new Error('Name, resource, and action are required');
      }

      const existingPermission = await Permission.findOne({ where: { name } });
      if (existingPermission) {
        throw new Error('Permission with this name already exists');
      }

      const permission = await Permission.create({
        name,
        resource,
        action,
        description
      });

      return permission;
    } catch (error) {
      console.error('Create permission error:', error);
      throw error;
    }
  },

  seedDefaultPermissions: async () => {
    try {
      const defaultPermissions = [
        { name: 'create_access', resource: 'access', action: 'create', description: 'Create access requests' },
        { name: 'approve_access', resource: 'access', action: 'approve', description: 'Approve access requests' },
        { name: 'view_access', resource: 'access', action: 'view', description: 'View access requests' },
        { name: 'manage_users', resource: 'users', action: 'manage', description: 'Manage users' },
        { name: 'manage_estates', resource: 'estates', action: 'manage', description: 'Manage estates' },
        { name: 'view_reports', resource: 'reports', action: 'view', description: 'View reports' },
        { name: 'patients.create', resource: 'patients', action: 'create', description: 'Create patients' },
        { name: 'patients.read', resource: 'patients', action: 'read', description: 'View patients' },
        { name: 'patients.update', resource: 'patients', action: 'update', description: 'Update patients' },
        { name: 'patients.delete', resource: 'patients', action: 'delete', description: 'Delete patients' },
        { name: 'appointments.create', resource: 'appointments', action: 'create', description: 'Create appointments' },
        { name: 'appointments.read', resource: 'appointments', action: 'read', description: 'View appointments' },
        { name: 'appointments.update', resource: 'appointments', action: 'update', description: 'Update appointments' },
        { name: 'appointments.delete', resource: 'appointments', action: 'delete', description: 'Delete appointments' },
        { name: 'payments.create', resource: 'payments', action: 'create', description: 'Process payments' },
        { name: 'payments.read', resource: 'payments', action: 'read', description: 'View payments' }
      ];

      for (const permData of defaultPermissions) {
        const existing = await Permission.findOne({ where: { name: permData.name } });
        if (!existing) {
          await Permission.create(permData);
        }
      }

      return { message: 'Default permissions seeded successfully' };
    } catch (error) {
      console.error('Seed permissions error:', error);
      throw error;
    }
  }
};