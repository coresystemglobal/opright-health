'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscriptions', {
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
      plan_type: {
        type: Sequelize.ENUM('basic', 'standard', 'pro'),
        allowNull: false
      },
      billing_cycle: {
        type: Sequelize.ENUM('monthly', 'yearly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      status: {
        type: Sequelize.ENUM('active', 'cancelled', 'past_due', 'trialing'),
        allowNull: false,
        defaultValue: 'active'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      current_period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      current_period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      trial_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      stripe_subscription_id: {
        type: Sequelize.STRING(100),
        allowNull: true
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

    await queryInterface.addIndex('subscriptions', ['tenant_id']);
    await queryInterface.addIndex('subscriptions', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscriptions');
  }
};