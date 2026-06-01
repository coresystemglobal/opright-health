'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('triage_questions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      text: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.ENUM('single', 'multi', 'boolean', 'number'), allowNull: false },
      symptom_group: { type: Sequelize.STRING(100), allowNull: false },
      order: { type: Sequelize.INTEGER, allowNull: false },
      condition: { type: Sequelize.JSONB, allowNull: true },
      options: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('triage_questions', ['symptom_group'], { name: 'triage_questions_symptom_group_idx' });
    await queryInterface.addIndex('triage_questions', ['order'], { name: 'triage_questions_order_idx' });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('triage_questions'); }
};
