'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // consent_records
    await queryInterface.createTable('consent_records', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      consent_type: {
        type: Sequelize.ENUM('data_processing', 'marketing', 'research', 'data_sharing', 'sms', 'email'),
        allowNull: false
      },
      granted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      granted_at: { type: Sequelize.DATE, allowNull: true },
      withdrawn_at: { type: Sequelize.DATE, allowNull: true },
      version: { type: Sequelize.STRING(30), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('consent_records', ['tenant_id'], { name: 'consent_records_tenant_id_idx' });
    await queryInterface.addIndex('consent_records', ['patient_id'], { name: 'consent_records_patient_id_idx' });
    await queryInterface.addIndex('consent_records', ['consent_type'], { name: 'consent_records_type_idx' });

    // data_subject_requests
    await queryInterface.createTable('data_subject_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      request_type: {
        type: Sequelize.ENUM('access', 'erasure', 'rectification'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reason: { type: Sequelize.TEXT, allowNull: true },
      result_notes: { type: Sequelize.TEXT, allowNull: true },
      requested_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      handled_by: { type: Sequelize.UUID, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('data_subject_requests', ['tenant_id'], { name: 'dsr_tenant_id_idx' });
    await queryInterface.addIndex('data_subject_requests', ['patient_id'], { name: 'dsr_patient_id_idx' });
    await queryInterface.addIndex('data_subject_requests', ['request_type'], { name: 'dsr_type_idx' });
    await queryInterface.addIndex('data_subject_requests', ['status'], { name: 'dsr_status_idx' });

    // Patient anonymization flags (guarded)
    const patients = await queryInterface.describeTable('patients');
    if (!patients.is_anonymized) {
      await queryInterface.addColumn('patients', 'is_anonymized', {
        type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
      });
    }
    if (!patients.anonymized_at) {
      await queryInterface.addColumn('patients', 'anonymized_at', {
        type: Sequelize.DATE, allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    const patients = await queryInterface.describeTable('patients');
    if (patients.anonymized_at) await queryInterface.removeColumn('patients', 'anonymized_at');
    if (patients.is_anonymized) await queryInterface.removeColumn('patients', 'is_anonymized');
    await queryInterface.dropTable('data_subject_requests');
    await queryInterface.dropTable('consent_records');
  }
};
