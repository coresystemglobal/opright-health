'use strict';

/**
 * Master Patient Index (MPI): global, cross-tenant `persons` table.
 *
 * Identity-key uniqueness is enforced with PARTIAL unique indexes — unique only
 * when the key is present, the row is not a merged tombstone, and the row is not
 * soft-deleted. These cannot be expressed with queryInterface.addIndex, so they
 * are created with raw SQL.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('persons', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      national_id: { type: Sequelize.STRING(30), allowNull: true },
      verified_email: { type: Sequelize.STRING(255), allowNull: true },
      verified_phone: { type: Sequelize.STRING(30), allowNull: true },
      first_name: { type: Sequelize.STRING(100), allowNull: true },
      middle_name: { type: Sequelize.STRING(100), allowNull: true },
      last_name: { type: Sequelize.STRING(100), allowNull: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      gender: { type: Sequelize.ENUM('male', 'female', 'other', 'unknown'), allowNull: true },
      status: { type: Sequelize.ENUM('provisional', 'verified', 'merged', 'deactivated'), allowNull: false, defaultValue: 'provisional' },
      merged_into_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'persons', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('persons', ['last_name', 'date_of_birth'], { name: 'persons_name_dob_idx' });
    await queryInterface.addIndex('persons', ['status'], { name: 'persons_status_idx' });

    // Partial unique indexes on the identity keys (raw SQL — WHERE clauses).
    const partialUnique = (col, name) =>
      queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "${name}" ON "persons" ("${col}") ` +
        `WHERE "${col}" IS NOT NULL AND "status" <> 'merged' AND "deleted_at" IS NULL;`
      );
    await partialUnique('national_id', 'persons_national_id_uq');
    await partialUnique('verified_email', 'persons_verified_email_uq');
    await partialUnique('verified_phone', 'persons_verified_phone_uq');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "persons_national_id_uq";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "persons_verified_email_uq";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "persons_verified_phone_uq";');
    await queryInterface.dropTable('persons');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_persons_gender";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_persons_status";');
  }
};
