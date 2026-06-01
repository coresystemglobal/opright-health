'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('triage_answers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      session_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'triage_sessions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      question_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'triage_questions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      answer_value: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('triage_answers', ['session_id'], { name: 'triage_answers_session_id_idx' });
    await queryInterface.addIndex('triage_answers', ['question_id'], { name: 'triage_answers_question_id_idx' });
    await queryInterface.addIndex('triage_answers', ['session_id', 'question_id'], { name: 'triage_answers_session_question_idx', unique: true });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('triage_answers'); }
};
