'use strict';

/** Payments PR 4: idempotency ledger for inbound gateway webhooks. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhook_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      provider: { type: Sequelize.STRING(30), allowNull: false },
      event_key: { type: Sequelize.STRING(200), allowNull: false },
      event_type: { type: Sequelize.STRING(100), allowNull: true },
      processed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('webhook_events', ['provider', 'event_key'], { unique: true, name: 'webhook_events_provider_key_uq' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('webhook_events');
  }
};
