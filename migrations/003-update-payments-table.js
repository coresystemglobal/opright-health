'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add reference column if it doesn't exist
    await queryInterface.addColumn(
      'payments',
      'reference',
      {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      }
    ).catch(error => {
      // Column might already exist
      console.log('Column reference might already exist:', error.message);
    });

    // Add appointment_id column if it doesn't exist
    await queryInterface.addColumn(
      'payments',
      'appointment_id',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'appointments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    ).catch(error => {
      // Column might already exist
      console.log('Column appointment_id might already exist:', error.message);
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the reference column if it exists
    await queryInterface.removeColumn('payments', 'reference')
      .catch(error => {
        console.log('Column reference might not exist:', error.message);
      });
    
    // Remove the appointment_id column if it exists
    await queryInterface.removeColumn('payments', 'appointment_id')
      .catch(error => {
        console.log('Column appointment_id might not exist:', error.message);
      });
  }
};