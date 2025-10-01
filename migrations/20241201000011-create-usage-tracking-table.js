'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('usage_tracking', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      patients_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      appointments_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lab_tests_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      storage_used_mb: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      api_calls_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('usage_tracking', ['tenant_id']);
    await queryInterface.addIndex('usage_tracking', ['period_start', 'period_end']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('usage_tracking');
  }
};