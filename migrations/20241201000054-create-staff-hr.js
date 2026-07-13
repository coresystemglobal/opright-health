'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── staff_profiles ──────────────────────────────────────────────────────
    await queryInterface.createTable('staff_profiles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      employee_no: { type: Sequelize.STRING(50), allowNull: false },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      job_title: { type: Sequelize.STRING(150), allowNull: false },
      employment_type: {
        type: Sequelize.ENUM('full_time', 'part_time', 'contract', 'locum', 'intern', 'volunteer'),
        allowNull: false,
        defaultValue: 'full_time'
      },
      employment_status: {
        type: Sequelize.ENUM('active', 'probation', 'on_leave', 'suspended', 'terminated'),
        allowNull: false,
        defaultValue: 'active'
      },
      hire_date: { type: Sequelize.DATEONLY, allowNull: false },
      termination_date: { type: Sequelize.DATEONLY, allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      emergency_contact_name: { type: Sequelize.STRING(200), allowNull: true },
      emergency_contact_phone: { type: Sequelize.STRING(30), allowNull: true },
      license_number: { type: Sequelize.STRING(100), allowNull: true },
      license_type: { type: Sequelize.STRING(100), allowNull: true },
      license_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      base_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      user_id: { type: Sequelize.UUID, allowNull: true },
      department_id: { type: Sequelize.UUID, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('staff_profiles', ['tenant_id'], { name: 'staff_profiles_tenant_id_idx' });
    await queryInterface.addIndex('staff_profiles', ['employment_status'], { name: 'staff_profiles_status_idx' });
    await queryInterface.addIndex('staff_profiles', ['department_id'], { name: 'staff_profiles_department_idx' });
    await queryInterface.addIndex('staff_profiles', ['license_expiry'], { name: 'staff_profiles_license_expiry_idx' });
    await queryInterface.addIndex('staff_profiles', ['employee_no', 'tenant_id'], { name: 'staff_profiles_employee_no_tenant_uq', unique: true });

    // ── staff_shifts ────────────────────────────────────────────────────────
    await queryInterface.createTable('staff_shifts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      staff_id: { type: Sequelize.UUID, allowNull: false },
      shift_type: {
        type: Sequelize.ENUM('morning', 'afternoon', 'night', 'on_call'),
        allowNull: false,
        defaultValue: 'morning'
      },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      ends_at: { type: Sequelize.DATE, allowNull: false },
      is_on_call: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'cancelled', 'missed'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      notes: { type: Sequelize.STRING(500), allowNull: true },
      department_id: { type: Sequelize.UUID, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('staff_shifts', ['tenant_id'], { name: 'staff_shifts_tenant_id_idx' });
    await queryInterface.addIndex('staff_shifts', ['staff_id'], { name: 'staff_shifts_staff_id_idx' });
    await queryInterface.addIndex('staff_shifts', ['department_id'], { name: 'staff_shifts_department_idx' });
    await queryInterface.addIndex('staff_shifts', ['starts_at'], { name: 'staff_shifts_starts_at_idx' });
    await queryInterface.addIndex('staff_shifts', ['is_on_call'], { name: 'staff_shifts_on_call_idx' });

    // ── staff_leave_requests ────────────────────────────────────────────────
    await queryInterface.createTable('staff_leave_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      staff_id: { type: Sequelize.UUID, allowNull: false },
      leave_type: {
        type: Sequelize.ENUM('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid', 'study', 'other'),
        allowNull: false,
        defaultValue: 'annual'
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      reason: { type: Sequelize.STRING(1000), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reviewed_by: { type: Sequelize.UUID, allowNull: true },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      review_notes: { type: Sequelize.STRING(1000), allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('staff_leave_requests', ['tenant_id'], { name: 'staff_leave_tenant_id_idx' });
    await queryInterface.addIndex('staff_leave_requests', ['staff_id'], { name: 'staff_leave_staff_id_idx' });
    await queryInterface.addIndex('staff_leave_requests', ['status'], { name: 'staff_leave_status_idx' });
    await queryInterface.addIndex('staff_leave_requests', ['start_date'], { name: 'staff_leave_start_date_idx' });

    // ── staff_attendance ────────────────────────────────────────────────────
    await queryInterface.createTable('staff_attendance', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      staff_id: { type: Sequelize.UUID, allowNull: false },
      work_date: { type: Sequelize.DATEONLY, allowNull: false },
      clock_in: { type: Sequelize.DATE, allowNull: true },
      clock_out: { type: Sequelize.DATE, allowNull: true },
      hours_worked: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('present', 'late', 'absent', 'half_day', 'on_leave'),
        allowNull: false,
        defaultValue: 'present'
      },
      notes: { type: Sequelize.STRING(500), allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('staff_attendance', ['tenant_id'], { name: 'staff_attendance_tenant_id_idx' });
    await queryInterface.addIndex('staff_attendance', ['staff_id'], { name: 'staff_attendance_staff_id_idx' });
    await queryInterface.addIndex('staff_attendance', ['work_date'], { name: 'staff_attendance_work_date_idx' });
    await queryInterface.addIndex('staff_attendance', ['staff_id', 'work_date'], { name: 'staff_attendance_staff_date_uq', unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('staff_attendance');
    await queryInterface.dropTable('staff_leave_requests');
    await queryInterface.dropTable('staff_shifts');
    await queryInterface.dropTable('staff_profiles');
  }
};
