'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add department_id to doctors table for formal department management
    await queryInterface.addColumn('doctors', 'department_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to departments table for formal department management'
    });

    // Add index
    await queryInterface.addIndex('doctors', ['department_id'], {
      name: 'doctors_department_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('doctors', 'department_id');
  }
};
