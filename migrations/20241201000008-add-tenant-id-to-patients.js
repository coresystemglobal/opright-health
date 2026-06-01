'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('patients', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('patients', ['tenant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('patients', 'tenant_id');
  }
};