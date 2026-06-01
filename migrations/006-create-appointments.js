'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('appointments', {
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
        allowNull: false,
        references: {
          model: 'doctors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      appointment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      appointment_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      status: {
        type: Sequelize.ENUM(
          'scheduled',
          'confirmed',
          'in_progress',
          'completed',
          'cancelled',
          'no_show',
          'rescheduled'
        ),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      appointment_type: {
        type: Sequelize.ENUM(
          'new_patient',
          'follow_up',
          'emergency',
          'routine_checkup',
          'consultation',
          'procedure',
          'lab_test',
          'pathology',
          'radiology_imaging',
          'blood_work',
          'specimen_collection'
        ),
        allowNull: false,
        defaultValue: 'consultation'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      chief_complaint: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      diagnosis: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      treatment_plan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      prescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      cancelled_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      checked_in_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      consultation_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      is_follow_up: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      parent_appointment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'appointments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('appointments', ['doctor_id', 'appointment_date', 'appointment_time'], {
      unique: true,
      name: 'appointments_doctor_datetime_unique',
      where: {
        deleted_at: null,
        status: ['scheduled', 'confirmed', 'in_progress']
      }
    });

    await queryInterface.addIndex('appointments', ['patient_id'], {
      name: 'appointments_patient_id_idx'
    });

    await queryInterface.addIndex('appointments', ['doctor_id'], {
      name: 'appointments_doctor_id_idx'
    });

    await queryInterface.addIndex('appointments', ['appointment_date'], {
      name: 'appointments_appointment_date_idx'
    });

    await queryInterface.addIndex('appointments', ['status'], {
      name: 'appointments_status_idx'
    });

    await queryInterface.addIndex('appointments', ['appointment_type'], {
      name: 'appointments_appointment_type_idx'
    });

    await queryInterface.addIndex('appointments', ['parent_appointment_id'], {
      name: 'appointments_parent_appointment_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('appointments');
  }
};