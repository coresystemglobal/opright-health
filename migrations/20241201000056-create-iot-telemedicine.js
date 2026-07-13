'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── iot_devices ─────────────────────────────────────────────────────────
    await queryInterface.createTable('iot_devices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      external_device_id: { type: Sequelize.STRING(100), allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      device_type: {
        type: Sequelize.ENUM('vital_monitor', 'glucose_meter', 'blood_pressure_monitor', 'thermometer', 'pulse_oximeter', 'ecg_monitor', 'weight_scale', 'wearable', 'other'),
        allowNull: false,
        defaultValue: 'vital_monitor'
      },
      location: { type: Sequelize.STRING(200), allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'maintenance', 'decommissioned'),
        allowNull: false,
        defaultValue: 'active'
      },
      thresholds: { type: Sequelize.JSONB, allowNull: true },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      assigned_patient_id: { type: Sequelize.UUID, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('iot_devices', ['tenant_id'], { name: 'iot_devices_tenant_id_idx' });
    await queryInterface.addIndex('iot_devices', ['status'], { name: 'iot_devices_status_idx' });
    await queryInterface.addIndex('iot_devices', ['assigned_patient_id'], { name: 'iot_devices_patient_idx' });
    await queryInterface.addIndex('iot_devices', ['external_device_id', 'tenant_id'], { name: 'iot_devices_ext_id_tenant_uq', unique: true });

    // ── iot_device_readings ─────────────────────────────────────────────────
    await queryInterface.createTable('iot_device_readings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      device_id: { type: Sequelize.UUID, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: true },
      metrics: { type: Sequelize.JSONB, allowNull: false },
      alerts: { type: Sequelize.JSONB, allowNull: true },
      is_abnormal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      recorded_at: { type: Sequelize.DATE, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('iot_device_readings', ['tenant_id'], { name: 'iot_readings_tenant_id_idx' });
    await queryInterface.addIndex('iot_device_readings', ['device_id'], { name: 'iot_readings_device_idx' });
    await queryInterface.addIndex('iot_device_readings', ['patient_id'], { name: 'iot_readings_patient_idx' });
    await queryInterface.addIndex('iot_device_readings', ['recorded_at'], { name: 'iot_readings_recorded_at_idx' });
    await queryInterface.addIndex('iot_device_readings', ['is_abnormal'], { name: 'iot_readings_abnormal_idx' });

    // ── telemedicine_sessions ───────────────────────────────────────────────
    await queryInterface.createTable('telemedicine_sessions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      appointment_id: { type: Sequelize.UUID, allowNull: true },
      doctor_id: { type: Sequelize.UUID, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      provider: {
        type: Sequelize.ENUM('daily_co', 'jitsi', 'twilio', 'webrtc', 'external'),
        allowNull: false,
        defaultValue: 'webrtc'
      },
      room_name: { type: Sequelize.STRING(200), allowNull: false },
      join_url: { type: Sequelize.STRING(500), allowNull: true },
      host_url: { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type: Sequelize.ENUM('scheduled', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      scheduled_at: { type: Sequelize.DATE, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      ended_at: { type: Sequelize.DATE, allowNull: true },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      recording_url: { type: Sequelize.STRING(500), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('telemedicine_sessions', ['tenant_id'], { name: 'telemed_sessions_tenant_id_idx' });
    await queryInterface.addIndex('telemedicine_sessions', ['doctor_id'], { name: 'telemed_sessions_doctor_idx' });
    await queryInterface.addIndex('telemedicine_sessions', ['patient_id'], { name: 'telemed_sessions_patient_idx' });
    await queryInterface.addIndex('telemedicine_sessions', ['appointment_id'], { name: 'telemed_sessions_appointment_idx' });
    await queryInterface.addIndex('telemedicine_sessions', ['status'], { name: 'telemed_sessions_status_idx' });
    await queryInterface.addIndex('telemedicine_sessions', ['scheduled_at'], { name: 'telemed_sessions_scheduled_at_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('telemedicine_sessions');
    await queryInterface.dropTable('iot_device_readings');
    await queryInterface.dropTable('iot_devices');
  }
};
