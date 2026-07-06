'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'totp_secret', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'totp_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('users', 'totp_backup_codes', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'totp_secret');
    await queryInterface.removeColumn('users', 'totp_enabled');
    await queryInterface.removeColumn('users', 'totp_backup_codes');
  },
};
