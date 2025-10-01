'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('users', ['tenant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'tenant_id');
  }
};