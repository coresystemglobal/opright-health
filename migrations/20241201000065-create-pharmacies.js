'use strict';

/** Facility profile for pharmacy tenants (Option B). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pharmacies', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      name: { type: Sequelize.STRING(200), allowNull: false },
      short_name: { type: Sequelize.STRING(100), allowNull: true },
      license_number: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      pharmacy_type: { type: Sequelize.ENUM('retail', 'hospital', 'clinical', 'compounding', 'wholesale', 'other'), allowNull: false, defaultValue: 'retail' },
      controlled_substance_license: { type: Sequelize.STRING(50), allowNull: true },
      accreditation_status: { type: Sequelize.ENUM('accredited', 'provisional', 'not_accredited', 'under_review'), allowNull: false, defaultValue: 'not_accredited' },
      accrediting_body: { type: Sequelize.STRING(100), allowNull: true },
      accreditation_expiry: { type: Sequelize.DATE, allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      state: { type: Sequelize.STRING(100), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      operating_hours: { type: Sequelize.JSONB, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      established_date: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('pharmacies', ['tenant_id'], { name: 'pharmacies_tenant_idx' });
    await queryInterface.addIndex('pharmacies', ['pharmacy_type'], { name: 'pharmacies_type_idx' });
    await queryInterface.addIndex('pharmacies', ['is_active'], { name: 'pharmacies_active_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pharmacies');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pharmacies_pharmacy_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pharmacies_accreditation_status";');
  }
};
