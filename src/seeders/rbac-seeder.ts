import { Role, Permission, RolePermission } from '../models';
import { RoleType } from '../models/role.model';

export class RBACSeeder {
  static async seedAll() {
    try {
      await this.seedPermissions();
      await this.seedRoles();
      await this.seedRolePermissions();
      console.log('RBAC seeding completed successfully');
    } catch (error) {
      console.error('RBAC seeding failed:', error);
      throw error;
    }
  }

  private static async seedPermissions() {
    const permissions = [
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

    for (const permData of permissions) {
      const existing = await Permission.findOne({ where: { name: permData.name } });
      if (!existing) {
        await Permission.create(permData);
      }
    }
  }

  private static async seedRoles() {
    const roles = [
      { role: RoleType.VISITOR, description: 'Visitor with limited access' },
      { role: RoleType.PATIENT, description: 'Patient with access to own records' },
      { role: RoleType.DOCTOR, description: 'Doctor with medical access' },
      { role: RoleType.SECURITY, description: 'Security personnel' },
      { role: RoleType.MANAGER, description: 'Manager with administrative access' },
      { role: RoleType.ADMIN, description: 'Administrator with full access' },
      { role: RoleType.SUPER_ADMIN, description: 'Super administrator with all permissions' }
    ];

    for (const roleData of roles) {
      const existing = await Role.findOne({ where: { role: roleData.role } });
      if (!existing) {
        await Role.create(roleData);
      }
    }
  }

  private static async seedRolePermissions() {
    // Get all roles and permissions
    const roles = await Role.findAll();
    const permissions = await Permission.findAll();

    const rolePermissionMap: { [key: string]: string[] } = {
      [RoleType.VISITOR]: ['view_access'],
      [RoleType.PATIENT]: ['view_access', 'patients.read', 'appointments.read'],
      [RoleType.SECURITY]: ['create_access', 'view_access'],
      [RoleType.DOCTOR]: ['patients.create', 'patients.read', 'patients.update', 'appointments.create', 'appointments.read', 'appointments.update'],
      [RoleType.MANAGER]: ['create_access', 'approve_access', 'view_access', 'manage_users', 'patients.read', 'appointments.read', 'payments.read'],
      [RoleType.ADMIN]: ['manage_estates', 'view_reports', 'create_access', 'approve_access', 'view_access', 'manage_users', 'patients.create', 'patients.read', 'patients.update', 'appointments.create', 'appointments.read', 'appointments.update', 'payments.create', 'payments.read'],
      [RoleType.SUPER_ADMIN]: permissions.map(p => p.name) // All permissions
    };

    for (const role of roles) {
      const permissionNames = rolePermissionMap[role.role as RoleType] || [];
      const rolePermissions = permissions.filter(p => permissionNames.includes(p.name));

      for (const permission of rolePermissions) {
        const existing = await RolePermission.findOne({
          where: { role_id: role.id, permission_id: permission.id }
        });

        if (!existing) {
          await RolePermission.create({
            role_id: role.id,
            permission_id: permission.id
          });
        }
      }
    }
  }
}