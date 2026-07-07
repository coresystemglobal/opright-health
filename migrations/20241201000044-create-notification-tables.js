'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // notifications (persistent history + read state)
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: true },
      type: {
        type: Sequelize.ENUM('appointment_reminder', 'appointment_booked', 'appointment_cancelled', 'appointment_rescheduled', 'lab_result', 'prescription_ready', 'emergency', 'system_alert', 'payment_status'),
        allowNull: false
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      data: { type: Sequelize.JSONB, allowNull: true },
      delivered_channels: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('notifications', ['tenant_id'], { name: 'notifications_tenant_id_idx' });
    await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id_idx' });
    await queryInterface.addIndex('notifications', ['type'], { name: 'notifications_type_idx' });
    await queryInterface.addIndex('notifications', ['is_read'], { name: 'notifications_is_read_idx' });

    // push_subscriptions (FCM tokens + web-push subscriptions)
    await queryInterface.createTable('push_subscriptions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      platform: { type: Sequelize.ENUM('fcm', 'web'), allowNull: false },
      token: { type: Sequelize.TEXT, allowNull: false, unique: true },
      subscription: { type: Sequelize.JSONB, allowNull: true },
      device_label: { type: Sequelize.STRING(300), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('push_subscriptions', ['user_id'], { name: 'push_subscriptions_user_id_idx' });
    await queryInterface.addIndex('push_subscriptions', ['platform'], { name: 'push_subscriptions_platform_idx' });

    // notification_preferences (per-user channel prefs)
    await queryInterface.createTable('notification_preferences', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      channels: { type: Sequelize.JSONB, allowNull: true },
      overrides: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notification_preferences');
    await queryInterface.dropTable('push_subscriptions');
    await queryInterface.dropTable('notifications');
  }
};
