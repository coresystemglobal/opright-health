'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('triage_sessions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tenant_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      status: { type: Sequelize.ENUM('in_progress', 'completed', 'abandoned'), allowNull: false, defaultValue: 'in_progress' },
      primary_symptom: { type: Sequelize.STRING(200), allowNull: false },
      risk_level: { type: Sequelize.ENUM('low', 'moderate', 'urgent', 'emergency'), allowNull: true },
      recommended_action: { type: Sequelize.TEXT, allowNull: true },
      score: { type: Sequelize.INTEGER, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('triage_sessions', ['user_id'], { name: 'triage_sessions_user_id_idx' });
    await queryInterface.addIndex('triage_sessions', ['tenant_id'], { name: 'triage_sessions_tenant_id_idx' });
    await queryInterface.addIndex('triage_sessions', ['status'], { name: 'triage_sessions_status_idx' });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('triage_sessions'); }
};
