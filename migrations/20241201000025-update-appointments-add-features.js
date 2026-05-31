'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add ICD-10 codes to appointments
    await queryInterface.addColumn('appointments', 'icd10_codes', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Array of ICD-10 diagnosis codes'
    });

    // Add recurring appointment fields
    await queryInterface.addColumn('appointments', 'is_recurring', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('appointments', 'recurrence_pattern', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Recurrence pattern: {frequency, interval, endDate, daysOfWeek}'
    });

    await queryInterface.addColumn('appointments', 'parent_recurring_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'appointments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Parent recurring appointment ID for series instances'
    });

    // Add resource booking
    await queryInterface.addColumn('appointments', 'resource_id', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Resource ID if room/equipment is booked'
    });

    // Add indexes
    await queryInterface.addIndex('appointments', ['is_recurring'], {
      name: 'appointments_is_recurring_idx'
    });

    await queryInterface.addIndex('appointments', ['parent_recurring_id'], {
      name: 'appointments_parent_recurring_id_idx'
    });

    await queryInterface.addIndex('appointments', ['resource_id'], {
      name: 'appointments_resource_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('appointments', 'icd10_codes');
    await queryInterface.removeColumn('appointments', 'is_recurring');
    await queryInterface.removeColumn('appointments', 'recurrence_pattern');
    await queryInterface.removeColumn('appointments', 'parent_recurring_id');
    await queryInterface.removeColumn('appointments', 'resource_id');
  }
};
