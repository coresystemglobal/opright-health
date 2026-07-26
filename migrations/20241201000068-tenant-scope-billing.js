'use strict';

/**
 * Payments PR 0: tenant-isolate patient billing. `invoices` and `payments` had
 * no tenant link, so listings leaked across tenants. Add a nullable tenant_id
 * (no forced backfill; legacy rows become invisible to tenant-scoped queries).
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
    for (const table of ['invoices', 'payments']) {
      const desc = await queryInterface.describeTable(table);
      if (!desc.tenant_id) {
        await queryInterface.addColumn(table, 'tenant_id', FK(Sequelize));
        await queryInterface.addIndex(table, ['tenant_id'], { name: `${table}_tenant_idx` });
      }
    }
  },

  down: async (queryInterface) => {
    for (const table of ['invoices', 'payments']) {
      await queryInterface.removeIndex(table, `${table}_tenant_idx`).catch(() => {});
      await queryInterface.removeColumn(table, 'tenant_id').catch(() => {});
    }
  }
};
