'use strict';

/**
 * MPI Phase 2: consent-gated cross-tenant record sharing.
 * A grant authorizes source_tenant to release a scope of a Person's records to
 * recipient_tenant. This table backs the only sanctioned cross-tenant read path.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('patient_record_shares', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      person_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'persons', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      source_tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      recipient_tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      scope: {
        type: Sequelize.ENUM('demographics', 'allergies', 'medications', 'lab_results', 'clinical_notes', 'full_record'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'revoked', 'expired'),
        allowNull: false,
        defaultValue: 'active'
      },
      granted_at: { type: Sequelize.DATE, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      consent_signature_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'consent_signatures', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('patient_record_shares', ['person_id'], { name: 'record_shares_person_idx' });
    await queryInterface.addIndex('patient_record_shares', ['recipient_tenant_id', 'status'], { name: 'record_shares_recipient_status_idx' });
    await queryInterface.addIndex('patient_record_shares', ['source_tenant_id'], { name: 'record_shares_source_idx' });
    await queryInterface.addIndex('patient_record_shares', ['expires_at'], { name: 'record_shares_expires_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('patient_record_shares');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_patient_record_shares_scope";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_patient_record_shares_status";');
  }
};
