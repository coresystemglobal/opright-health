'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('triage_rules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      rule_code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      symptom_group: { type: Sequelize.STRING(100), allowNull: false },
      condition: { type: Sequelize.JSONB, allowNull: false },
      weight: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      severity: { type: Sequelize.ENUM('low', 'moderate', 'high', 'critical'), allowNull: false },
      action_override: { type: Sequelize.STRING, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('triage_rules', ['symptom_group'], { name: 'triage_rules_symptom_group_idx' });
    await queryInterface.addIndex('triage_rules', ['is_active'], { name: 'triage_rules_is_active_idx' });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('triage_rules'); }
};
