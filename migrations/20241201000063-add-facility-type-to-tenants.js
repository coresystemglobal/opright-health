'use strict';

/**
 * Option B: add Tenant.facility_type so a tenant can be a hospital, standalone
 * laboratory, pharmacy, etc. Existing tenants default to 'hospital'; the
 * system platform (DTC) tenant is tagged 'platform'.
 */
const PLATFORM_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const TYPES = ['hospital', 'laboratory', 'pharmacy', 'clinic', 'diagnostic_center', 'platform', 'other'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('tenants');
    if (!table.facility_type) {
      await queryInterface.addColumn('tenants', 'facility_type', {
        type: Sequelize.ENUM(...TYPES),
        allowNull: false,
        defaultValue: 'hospital'
      });
    }
    // Tag the platform (DTC) tenant, if it has been seeded.
    await queryInterface.sequelize.query(
      `UPDATE "tenants" SET "facility_type" = 'platform' WHERE id = '${PLATFORM_TENANT_ID}';`
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenants', 'facility_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tenants_facility_type";');
  }
};
