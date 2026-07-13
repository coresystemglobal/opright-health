'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staff_performance_reviews', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      staff_id: { type: Sequelize.UUID, allowNull: false },
      reviewer_id: { type: Sequelize.UUID, allowNull: true },
      review_type: {
        type: Sequelize.ENUM('annual', 'probation', 'quarterly', 'mid_year', 'ad_hoc'),
        allowNull: false,
        defaultValue: 'annual'
      },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      period_end: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'acknowledged', 'finalized'),
        allowNull: false,
        defaultValue: 'draft'
      },
      overall_rating: { type: Sequelize.INTEGER, allowNull: true },
      ratings: { type: Sequelize.JSONB, allowNull: true },
      strengths: { type: Sequelize.TEXT, allowNull: true },
      areas_for_improvement: { type: Sequelize.TEXT, allowNull: true },
      goals: { type: Sequelize.JSONB, allowNull: true },
      reviewer_comments: { type: Sequelize.TEXT, allowNull: true },
      staff_comments: { type: Sequelize.TEXT, allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      finalized_at: { type: Sequelize.DATE, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('staff_performance_reviews', ['tenant_id'], { name: 'staff_reviews_tenant_id_idx' });
    await queryInterface.addIndex('staff_performance_reviews', ['staff_id'], { name: 'staff_reviews_staff_id_idx' });
    await queryInterface.addIndex('staff_performance_reviews', ['reviewer_id'], { name: 'staff_reviews_reviewer_id_idx' });
    await queryInterface.addIndex('staff_performance_reviews', ['status'], { name: 'staff_reviews_status_idx' });
    await queryInterface.addIndex('staff_performance_reviews', ['period_end'], { name: 'staff_reviews_period_end_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('staff_performance_reviews');
  }
};
