'use strict';

// Per-tenant reminder configuration + per-patient SMS opt-out.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tenants = await queryInterface.describeTable('tenants');
    if (!tenants.reminder_settings) {
      await queryInterface.addColumn('tenants', 'reminder_settings', {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }

    const patients = await queryInterface.describeTable('patients');
    if (!patients.sms_opt_out) {
      await queryInterface.addColumn('patients', 'sms_opt_out', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface) => {
    const tenants = await queryInterface.describeTable('tenants');
    if (tenants.reminder_settings) {
      await queryInterface.removeColumn('tenants', 'reminder_settings');
    }

    const patients = await queryInterface.describeTable('patients');
    if (patients.sms_opt_out) {
      await queryInterface.removeColumn('patients', 'sms_opt_out');
    }
  }
};
