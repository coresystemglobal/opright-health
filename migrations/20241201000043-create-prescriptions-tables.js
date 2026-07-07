'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('prescriptions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      prescription_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      doctor_id: { type: Sequelize.UUID, allowNull: false },
      appointment_id: { type: Sequelize.UUID, allowNull: true },
      status: {
        type: Sequelize.ENUM('draft', 'issued', 'sent_to_pharmacy', 'partially_dispensed', 'dispensed', 'cancelled'),
        allowNull: false,
        defaultValue: 'issued'
      },
      diagnosis: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      issued_at: { type: Sequelize.DATE, allowNull: true },
      pharmacy_name: { type: Sequelize.STRING(200), allowNull: true },
      sent_to_pharmacy_at: { type: Sequelize.DATE, allowNull: true },
      dispensed_at: { type: Sequelize.DATE, allowNull: true },
      dispensed_by: { type: Sequelize.UUID, allowNull: true },
      cancellation_reason: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('prescriptions', ['patient_id'], { name: 'prescriptions_patient_id_idx' });
    await queryInterface.addIndex('prescriptions', ['doctor_id'], { name: 'prescriptions_doctor_id_idx' });
    await queryInterface.addIndex('prescriptions', ['appointment_id'], { name: 'prescriptions_appointment_id_idx' });
    await queryInterface.addIndex('prescriptions', ['status'], { name: 'prescriptions_status_idx' });

    await queryInterface.createTable('prescription_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'prescriptions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      medication_name: { type: Sequelize.STRING(200), allowNull: false },
      dosage: { type: Sequelize.STRING(100), allowNull: false },
      strength: { type: Sequelize.STRING(50), allowNull: true },
      route: {
        type: Sequelize.ENUM('oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'inhalation', 'rectal', 'sublingual', 'transdermal', 'other'),
        allowNull: false,
        defaultValue: 'oral'
      },
      frequency: {
        type: Sequelize.ENUM('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_4_hours', 'every_6_hours', 'every_8_hours', 'every_12_hours', 'as_needed', 'weekly', 'monthly', 'other'),
        allowNull: false
      },
      duration: { type: Sequelize.STRING(100), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      is_dispensed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dispensed_quantity: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('prescription_items', ['prescription_id'], { name: 'prescription_items_prescription_id_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('prescription_items');
    await queryInterface.dropTable('prescriptions');
  }
};
