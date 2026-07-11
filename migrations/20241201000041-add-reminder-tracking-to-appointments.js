'use strict';

// Idempotent: tracks which appointment reminders (24h / 2h before) have
// already been sent, so the reminder cron never double-texts a patient.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('appointments');

    if (!table.reminder_24h_sent_at) {
      await queryInterface.addColumn('appointments', 'reminder_24h_sent_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    if (!table.reminder_2h_sent_at) {
      await queryInterface.addColumn('appointments', 'reminder_2h_sent_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('appointments');

    if (table.reminder_24h_sent_at) {
      await queryInterface.removeColumn('appointments', 'reminder_24h_sent_at');
    }
    if (table.reminder_2h_sent_at) {
      await queryInterface.removeColumn('appointments', 'reminder_2h_sent_at');
    }
  }
};
