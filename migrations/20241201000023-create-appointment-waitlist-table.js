'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('appointment_waitlist', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      doctor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'doctors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal'
      },
      status: {
        type: Sequelize.ENUM('waiting', 'contacted', 'scheduled', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'waiting'
      },
      preferred_date_start: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      preferred_date_end: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      preferred_time_slots: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'Preferred time slots, e.g., ["morning", "afternoon"]'
      },
      preferred_days: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true,
        comment: 'Preferred days of week: 0=Sunday, 1=Monday, etc.'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      contacted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to appointment if scheduled'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('appointment_waitlist', ['patient_id'], {
      name: 'appointment_waitlist_patient_id_idx'
    });

    await queryInterface.addIndex('appointment_waitlist', ['doctor_id'], {
      name: 'appointment_waitlist_doctor_id_idx'
    });

    await queryInterface.addIndex('appointment_waitlist', ['department_id'], {
      name: 'appointment_waitlist_department_id_idx'
    });

    await queryInterface.addIndex('appointment_waitlist', ['status'], {
      name: 'appointment_waitlist_status_idx'
    });

    await queryInterface.addIndex('appointment_waitlist', ['priority'], {
      name: 'appointment_waitlist_priority_idx'
    });

    await queryInterface.addIndex('appointment_waitlist', ['created_at'], {
      name: 'appointment_waitlist_created_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('appointment_waitlist');
  }
};
