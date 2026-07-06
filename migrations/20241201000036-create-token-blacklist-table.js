'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('token_blacklist', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      jti: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      token_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'refresh',
      },
      blacklisted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('token_blacklist', ['jti'], {
      name: 'token_blacklist_jti_idx',
      unique: true,
    });
    await queryInterface.addIndex('token_blacklist', ['expires_at'], {
      name: 'token_blacklist_expires_at_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('token_blacklist');
  },
};
