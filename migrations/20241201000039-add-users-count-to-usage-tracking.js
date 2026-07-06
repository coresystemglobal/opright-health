'use strict';

// Idempotent: main's original 20241201000036 migration added this same
// column before the modular refactor renumbered migrations, so databases
// that ran it already have users_count.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('usage_tracking');
    if (!table.users_count) {
      await queryInterface.addColumn('usage_tracking', 'users_count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('usage_tracking');
    if (table.users_count) {
      await queryInterface.removeColumn('usage_tracking', 'users_count');
    }
  }
};
