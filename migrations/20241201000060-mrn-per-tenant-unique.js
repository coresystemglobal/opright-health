'use strict';

/**
 * Make MRN unique PER TENANT instead of globally.
 *
 * The old global uniqueness came from two DB objects created in
 * 002-create-patients.js: the anonymous column constraint `patients_mrn_key`
 * (from inline `unique: true`) and the named index `patients_mrn_unique`.
 * Both are dropped and replaced with a composite unique index on
 * (tenant_id, mrn).
 *
 * No collision risk: global-unique is strictly stronger than (tenant_id, mrn),
 * so every existing row already satisfies the composite constraint.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeIndex('patients', 'patients_mrn_unique').catch(() => {});
    await queryInterface.sequelize.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_mrn_key";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "patients_mrn_key";');
    await queryInterface.addIndex('patients', ['tenant_id', 'mrn'], { unique: true, name: 'patients_tenant_mrn_uq' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('patients', 'patients_tenant_mrn_uq').catch(() => {});
    await queryInterface.addIndex('patients', ['mrn'], { unique: true, name: 'patients_mrn_unique' });
  }
};
