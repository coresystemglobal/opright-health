import { Role } from '@modules/rbac/role.model';
import { Permission } from '@modules/rbac/permission.model';
import { RolePermission } from '@modules/rbac/role-permission.model';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../config/rbac.config';
import sequelize from '../core/database';

async function seedQueueRBAC() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Create permissions
    const queuePermissions = [
      { name: PERMISSIONS.QUEUE_CHECK_IN, description: 'Check in patients to queue' },
      { name: PERMISSIONS.QUEUE_VIEW, description: 'View queue list' },
      { name: PERMISSIONS.QUEUE_CALL_NEXT, description: 'Call next patient from queue' },
      { name: PERMISSIONS.QUEUE_UPDATE_PRIORITY, description: 'Update patient priority in queue' },
      { name: PERMISSIONS.QUEUE_ANALYTICS, description: 'View queue analytics and reports' }
    ];

    for (const perm of queuePermissions) {
      await Permission.findOrCreate({
        where: { name: perm.name },
        defaults: perm
      });
    }
    console.log('Queue permissions created');

    // Assign permissions to roles
    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role) continue;

      for (const permName of permissions) {
        if (!permName.startsWith('queue:')) continue;
        
        const permission = await Permission.findOne({ where: { name: permName } });
        if (!permission) continue;

        await RolePermission.findOrCreate({
          where: {
            role_id: role.id,
            permission_id: permission.id
          }
        });
      }
    }
    console.log('Queue permissions assigned to roles');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding queue RBAC:', error);
    process.exit(1);
  }
}

seedQueueRBAC();
