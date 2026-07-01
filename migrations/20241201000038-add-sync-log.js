'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sync_logs', {
      client_sync_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('sync_logs', ['created_at'], {
      name: 'idx_sync_logs_created_at',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sync_logs');
  },
};
