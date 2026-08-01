'use strict';

/**
 * Option B, part 2: tenant-scope the laboratory data tables so a standalone lab
 * (or hospital lab) only sees its own catalog / orders / results.
 *
 * tenant_id is NULLABLE — existing tenant-less rows are left as-is (they become
 * invisible to tenant-scoped queries; a deployment can backfill an owner). The
 * lab-test catalog becomes per-tenant: test_code uniqueness moves from global
 * to (tenant_id, test_code).
 */
const FK = (Sequelize) => ({
  type: Sequelize.UUID,
  allowNull: true,
  references: { model: 'tenants', key: 'id' },
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of ['lab_tests', 'test_orders', 'test_results']) {
      const desc = await queryInterface.describeTable(table);
      if (!desc.tenant_id) {
        await queryInterface.addColumn(table, 'tenant_id', FK(Sequelize));
        await queryInterface.addIndex(table, ['tenant_id'], { name: `${table}_tenant_idx` });
      }
    }

    // lab-test catalog: global test_code uniqueness -> per-tenant.
    await queryInterface.removeIndex('lab_tests', 'lab_tests_test_code_unique').catch(() => {});
    await queryInterface.sequelize.query('ALTER TABLE "lab_tests" DROP CONSTRAINT IF EXISTS "lab_tests_test_code_key";');
    await queryInterface.addIndex('lab_tests', ['tenant_id', 'test_code'], {
      unique: true,
      name: 'lab_tests_tenant_code_uq'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Restore global test_code uniqueness.
    await queryInterface.removeIndex('lab_tests', 'lab_tests_tenant_code_uq').catch(() => {});
    await queryInterface.addIndex('lab_tests', ['test_code'], {
      unique: true,
      name: 'lab_tests_test_code_unique'
    });

    for (const table of ['lab_tests', 'test_orders', 'test_results']) {
      await queryInterface.removeIndex(table, `${table}_tenant_idx`).catch(() => {});
      await queryInterface.removeColumn(table, 'tenant_id').catch(() => {});
    }
  }
};
