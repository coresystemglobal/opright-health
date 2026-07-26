'use strict';

/**
 * Payments PR 2: fields needed to run Paystack subscriptions.
 * - tenants: paystack_customer_id, billing_email, denormalized subscription_status
 * - subscriptions: pending_plan_type (a downgrade scheduled for the next period)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tenants = await queryInterface.describeTable('tenants');
    if (!tenants.paystack_customer_id) {
      await queryInterface.addColumn('tenants', 'paystack_customer_id', { type: Sequelize.STRING(100), allowNull: true });
    }
    if (!tenants.billing_email) {
      await queryInterface.addColumn('tenants', 'billing_email', { type: Sequelize.STRING(255), allowNull: true });
    }
    if (!tenants.subscription_status) {
      await queryInterface.addColumn('tenants', 'subscription_status', { type: Sequelize.STRING(30), allowNull: true });
    }

    const subs = await queryInterface.describeTable('subscriptions');
    if (!subs.pending_plan_type) {
      // Reuse the existing plan_type enum for the scheduled-downgrade target.
      await queryInterface.addColumn('subscriptions', 'pending_plan_type', {
        type: Sequelize.ENUM('individual', 'basic', 'standard', 'pro'),
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('subscriptions', 'pending_plan_type').catch(() => {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_pending_plan_type";');
    for (const col of ['paystack_customer_id', 'billing_email', 'subscription_status']) {
      await queryInterface.removeColumn('tenants', col).catch(() => {});
    }
  }
};
