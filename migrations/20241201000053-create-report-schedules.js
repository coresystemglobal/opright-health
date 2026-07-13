'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('report_schedules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      report_type: {
        type: Sequelize.ENUM('digest', 'financial', 'operational-metrics', 'trends', 'inventory-valuation', 'patient-demographics', 'doctor-performance', 'appointment-analytics'),
        allowNull: false
      },
      format: {
        type: Sequelize.ENUM('html', 'csv', 'xlsx', 'pdf'),
        allowNull: false,
        defaultValue: 'html'
      },
      frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
        defaultValue: 'weekly'
      },
      recipients: { type: Sequelize.JSONB, allowNull: true },
      params: { type: Sequelize.JSONB, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      next_run_at: { type: Sequelize.DATE, allowNull: false },
      last_run_at: { type: Sequelize.DATE, allowNull: true },
      last_run_status: { type: Sequelize.STRING(500), allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('report_schedules', ['tenant_id'], { name: 'report_schedules_tenant_id_idx' });
    await queryInterface.addIndex('report_schedules', ['is_active'], { name: 'report_schedules_is_active_idx' });
    await queryInterface.addIndex('report_schedules', ['next_run_at'], { name: 'report_schedules_next_run_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('report_schedules');
  }
};
