'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // insurance_providers (payer directory)
    await queryInterface.createTable('insurance_providers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false },
      provider_type: {
        type: Sequelize.ENUM('hmo', 'private_insurer', 'government', 'corporate', 'other'),
        allowNull: false,
        defaultValue: 'hmo'
      },
      contact_email: { type: Sequelize.STRING(255), allowNull: true },
      contact_phone: { type: Sequelize.STRING(30), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('insurance_providers', ['tenant_id'], { name: 'insurance_providers_tenant_id_idx' });
    await queryInterface.addIndex('insurance_providers', ['code', 'tenant_id'], { name: 'insurance_providers_code_tenant_unique', unique: true });

    // patient_insurance_policies
    await queryInterface.createTable('patient_insurance_policies', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      insurance_provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'insurance_providers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      policy_number: { type: Sequelize.STRING(60), allowNull: false },
      plan_name: { type: Sequelize.STRING(150), allowNull: true },
      coverage_percentage: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      holder_name: { type: Sequelize.STRING(150), allowNull: true },
      relationship: {
        type: Sequelize.ENUM('self', 'spouse', 'child', 'other'),
        allowNull: false,
        defaultValue: 'self'
      },
      valid_from: { type: Sequelize.DATEONLY, allowNull: true },
      valid_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'expired'),
        allowNull: false,
        defaultValue: 'active'
      },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('patient_insurance_policies', ['tenant_id'], { name: 'policies_tenant_id_idx' });
    await queryInterface.addIndex('patient_insurance_policies', ['patient_id'], { name: 'policies_patient_id_idx' });
    await queryInterface.addIndex('patient_insurance_policies', ['insurance_provider_id'], { name: 'policies_provider_id_idx' });
    await queryInterface.addIndex('patient_insurance_policies', ['status'], { name: 'policies_status_idx' });

    // insurance_claims
    await queryInterface.createTable('insurance_claims', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      claim_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      claim_type: {
        type: Sequelize.ENUM('claim', 'preauthorization'),
        allowNull: false,
        defaultValue: 'claim'
      },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      insurance_provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'insurance_providers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      policy_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'patient_insurance_policies', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      invoice_id: { type: Sequelize.UUID, allowNull: true },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      service_date: { type: Sequelize.DATEONLY, allowNull: true },
      claimed_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      approved_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      copay_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      authorization_code: { type: Sequelize.STRING(80), allowNull: true },
      diagnosis: { type: Sequelize.TEXT, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      decided_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('insurance_claims', ['tenant_id'], { name: 'claims_tenant_id_idx' });
    await queryInterface.addIndex('insurance_claims', ['patient_id'], { name: 'claims_patient_id_idx' });
    await queryInterface.addIndex('insurance_claims', ['insurance_provider_id'], { name: 'claims_provider_id_idx' });
    await queryInterface.addIndex('insurance_claims', ['policy_id'], { name: 'claims_policy_id_idx' });
    await queryInterface.addIndex('insurance_claims', ['invoice_id'], { name: 'claims_invoice_id_idx' });
    await queryInterface.addIndex('insurance_claims', ['status'], { name: 'claims_status_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('insurance_claims');
    await queryInterface.dropTable('patient_insurance_policies');
    await queryInterface.dropTable('insurance_providers');
  }
};
