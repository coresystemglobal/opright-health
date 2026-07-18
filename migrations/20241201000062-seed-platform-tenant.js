'use strict';

/**
 * MPI Phase 3: seed the direct-to-consumer (DTC) platform tenant. Self-service
 * users who don't belong to a hospital are anchored here. Idempotent — inserts
 * only if a tenant with this id/subdomain doesn't already exist.
 */
const PLATFORM_TENANT_ID = '00000000-0000-4000-8000-000000000001';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM "tenants" WHERE id = '${PLATFORM_TENANT_ID}' OR subdomain = 'platform' LIMIT 1;`
    );
    if (rows && rows.length) return; // already seeded

    await queryInterface.bulkInsert('tenants', [{
      id: PLATFORM_TENANT_ID,
      name: 'Platform (Direct-to-Consumer)',
      subdomain: 'platform',
      status: 'active',
      contact_email: 'platform@system.local',
      contact_phone: '0000000000',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tenants', { id: PLATFORM_TENANT_ID });
  }
};
