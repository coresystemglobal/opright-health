'use strict';

/** Facility profile for laboratory tenants (Option B). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('laboratories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      name: { type: Sequelize.STRING(200), allowNull: false },
      short_name: { type: Sequelize.STRING(100), allowNull: true },
      license_number: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      lab_type: { type: Sequelize.ENUM('clinical', 'pathology', 'molecular', 'microbiology', 'radiology', 'reference', 'other'), allowNull: false, defaultValue: 'clinical' },
      accreditation_status: { type: Sequelize.ENUM('accredited', 'provisional', 'not_accredited', 'under_review'), allowNull: false, defaultValue: 'not_accredited' },
      accrediting_body: { type: Sequelize.STRING(100), allowNull: true },
      accreditation_expiry: { type: Sequelize.DATE, allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      state: { type: Sequelize.STRING(100), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      test_categories_offered: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: true },
      operating_hours: { type: Sequelize.JSONB, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      established_date: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('laboratories', ['tenant_id'], { name: 'laboratories_tenant_idx' });
    await queryInterface.addIndex('laboratories', ['lab_type'], { name: 'laboratories_type_idx' });
    await queryInterface.addIndex('laboratories', ['is_active'], { name: 'laboratories_active_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('laboratories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_laboratories_lab_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_laboratories_accreditation_status";');
  }
};
