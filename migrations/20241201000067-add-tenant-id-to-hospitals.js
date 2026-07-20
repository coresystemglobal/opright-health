'use strict';

/**
 * Reconnect the legacy `hospitals` facility table to `Tenant` (it had no
 * tenant link), so a hospital tenant owns its own profile — consistent with the
 * laboratories/pharmacies tables. Nullable: no forced backfill; legacy rows
 * become invisible to tenant-scoped queries (dev phase, no real data).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('hospitals');
    if (!desc.tenant_id) {
      await queryInterface.addColumn('hospitals', 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('hospitals', ['tenant_id'], { name: 'hospitals_tenant_idx' });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('hospitals', 'hospitals_tenant_idx').catch(() => {});
    await queryInterface.removeColumn('hospitals', 'tenant_id').catch(() => {});
  }
};
