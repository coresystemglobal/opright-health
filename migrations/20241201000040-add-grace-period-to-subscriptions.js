'use strict';

// Idempotent: main's original 20241201000037 migration added these same
// columns before the modular refactor renumbered migrations, so databases
// that ran it already have them.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('subscriptions');

    if (!table.paystack_subscription_code) {
      await queryInterface.addColumn('subscriptions', 'paystack_subscription_code', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }
    if (!table.cancelled_at) {
      await queryInterface.addColumn('subscriptions', 'cancelled_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    if (!table.grace_period_ends_at) {
      await queryInterface.addColumn('subscriptions', 'grace_period_ends_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('subscriptions');

    if (table.paystack_subscription_code) {
      await queryInterface.removeColumn('subscriptions', 'paystack_subscription_code');
    }
    if (table.cancelled_at) {
      await queryInterface.removeColumn('subscriptions', 'cancelled_at');
    }
    if (table.grace_period_ends_at) {
      await queryInterface.removeColumn('subscriptions', 'grace_period_ends_at');
    }
  }
};
