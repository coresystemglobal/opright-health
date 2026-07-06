/**
 * Run the comprehensive test-data seeder.
 *
 *   npx ts-node src/scripts/seed-test-data.ts
 */

import sequelize from '../core/database';
import { TestSeeder } from '../seeders/test-data.seeder';

async function seedTestData() {
  try {
    console.log('Starting test data seeding...');

    await sequelize.authenticate();
    console.log('Database connected successfully');

    await TestSeeder.seedAll();

    console.log('Test data seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Test data seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedTestData();
}

export { seedTestData };
