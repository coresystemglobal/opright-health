import sequelize from '../core/database';
import { RBACSeeder } from '../seeders/rbac-seeder';

async function seedRBAC() {
  try {
    console.log('Starting RBAC seeding...');
    
    // Ensure database connection
    await sequelize.authenticate();
    console.log('Database connected successfully');
    
    // Run seeder
    await RBACSeeder.seedAll();
    
    console.log('RBAC seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('RBAC seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedRBAC();
}

export { seedRBAC };