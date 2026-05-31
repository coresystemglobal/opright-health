'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('triage_results', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      session_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'triage_sessions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      score: { type: Sequelize.INTEGER, allowNull: false },
      risk_level: { type: Sequelize.ENUM('low', 'moderate', 'urgent', 'emergency'), allowNull: false },
      recommendation: { type: Sequelize.TEXT, allowNull: false },
      explanation: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.createTable('triage_audit_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      session_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'triage_sessions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      event_type: { type: Sequelize.STRING(100), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('triage_results', ['session_id'], { name: 'triage_results_session_id_idx' });
    await queryInterface.addIndex('triage_audit_logs', ['session_id'], { name: 'triage_audit_logs_session_id_idx' });
    await queryInterface.addIndex('triage_audit_logs', ['event_type'], { name: 'triage_audit_logs_event_type_idx' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('triage_audit_logs');
    await queryInterface.dropTable('triage_results');
  }
};
