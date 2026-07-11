'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // wards
    await queryInterface.createTable('wards', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      hospital_id: { type: Sequelize.UUID, allowNull: false },
      department_id: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false },
      ward_type: {
        type: Sequelize.ENUM('general', 'icu', 'maternity', 'pediatric', 'surgical', 'isolation', 'emergency', 'psychiatric', 'other'),
        allowNull: false,
        defaultValue: 'general'
      },
      gender_restriction: {
        type: Sequelize.ENUM('male', 'female', 'mixed'),
        allowNull: false,
        defaultValue: 'mixed'
      },
      floor: { type: Sequelize.STRING(50), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('wards', ['tenant_id'], { name: 'wards_tenant_id_idx' });
    await queryInterface.addIndex('wards', ['hospital_id'], { name: 'wards_hospital_id_idx' });
    await queryInterface.addIndex('wards', ['department_id'], { name: 'wards_department_id_idx' });
    await queryInterface.addIndex('wards', ['code', 'tenant_id'], { name: 'wards_code_tenant_unique', unique: true });

    // beds
    await queryInterface.createTable('beds', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ward_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'wards', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      bed_number: { type: Sequelize.STRING(30), allowNull: false },
      bed_type: {
        type: Sequelize.ENUM('standard', 'icu', 'pediatric', 'maternity', 'bariatric'),
        allowNull: false,
        defaultValue: 'standard'
      },
      status: {
        type: Sequelize.ENUM('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'),
        allowNull: false,
        defaultValue: 'available'
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('beds', ['tenant_id'], { name: 'beds_tenant_id_idx' });
    await queryInterface.addIndex('beds', ['ward_id'], { name: 'beds_ward_id_idx' });
    await queryInterface.addIndex('beds', ['status'], { name: 'beds_status_idx' });
    await queryInterface.addIndex('beds', ['ward_id', 'bed_number'], { name: 'beds_ward_bed_number_unique', unique: true });

    // admissions
    await queryInterface.createTable('admissions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      admission_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      ward_id: { type: Sequelize.UUID, allowNull: false },
      bed_id: { type: Sequelize.UUID, allowNull: true },
      admitting_doctor_id: { type: Sequelize.UUID, allowNull: true },
      status: {
        type: Sequelize.ENUM('admitted', 'discharged', 'transferred'),
        allowNull: false,
        defaultValue: 'admitted'
      },
      reason: { type: Sequelize.TEXT, allowNull: true },
      admitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      expected_discharge_at: { type: Sequelize.DATE, allowNull: true },
      discharged_at: { type: Sequelize.DATE, allowNull: true },
      discharge_notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('admissions', ['tenant_id'], { name: 'admissions_tenant_id_idx' });
    await queryInterface.addIndex('admissions', ['patient_id'], { name: 'admissions_patient_id_idx' });
    await queryInterface.addIndex('admissions', ['ward_id'], { name: 'admissions_ward_id_idx' });
    await queryInterface.addIndex('admissions', ['bed_id'], { name: 'admissions_bed_id_idx' });
    await queryInterface.addIndex('admissions', ['status'], { name: 'admissions_status_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('admissions');
    await queryInterface.dropTable('beds');
    await queryInterface.dropTable('wards');
  }
};
