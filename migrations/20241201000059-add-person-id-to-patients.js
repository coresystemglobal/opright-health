'use strict';

/**
 * Link each tenant-scoped Patient to a global MPI Person (nullable — a patient
 * may not yet be matched/linked to a Person).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('patients');
    if (!table.person_id) {
      await queryInterface.addColumn('patients', 'person_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'persons', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('patients', ['person_id'], { name: 'patients_person_id_idx' });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('patients');
    if (table.person_id) {
      await queryInterface.removeIndex('patients', 'patients_person_id_idx').catch(() => {});
      await queryInterface.removeColumn('patients', 'person_id');
    }
  }
};
