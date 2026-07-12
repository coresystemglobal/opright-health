'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('consent_signatures', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      consent_record_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'consent_records', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      signer_role: {
        type: Sequelize.ENUM('patient', 'guardian', 'witness', 'staff'),
        allowNull: false,
        defaultValue: 'patient'
      },
      signer_name: { type: Sequelize.STRING(150), allowNull: false },
      signature_type: {
        type: Sequelize.ENUM('drawn', 'typed', 'uploaded'),
        allowNull: false
      },
      signature_data: { type: Sequelize.TEXT, allowNull: false },
      document_hash: { type: Sequelize.STRING(64), allowNull: false },
      ip_address: { type: Sequelize.STRING(60), allowNull: true },
      user_agent: { type: Sequelize.STRING(400), allowNull: true },
      signed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('consent_signatures', ['tenant_id'], { name: 'consent_signatures_tenant_id_idx' });
    await queryInterface.addIndex('consent_signatures', ['consent_record_id'], { name: 'consent_signatures_consent_id_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('consent_signatures');
  }
};
