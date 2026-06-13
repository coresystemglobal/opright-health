'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('subscriptions', 'paystack_subscription_code', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addColumn('subscriptions', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('subscriptions', 'grace_period_ends_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('subscriptions', 'paystack_subscription_code');
    await queryInterface.removeColumn('subscriptions', 'cancelled_at');
    await queryInterface.removeColumn('subscriptions', 'grace_period_ends_at');
  }
};
