'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('test_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      order_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
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
      lab_test_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'lab_tests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'appointments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM(
          'ordered',
          'specimen_collected',
          'processing',
          'completed',
          'cancelled',
          'pending_review',
          'reviewed',
          'critical_alert'
        ),
        allowNull: false,
        defaultValue: 'ordered'
      },
      urgency: {
        type: Sequelize.ENUM('routine', 'urgent', 'stat', 'emergency'),
        allowNull: false,
        defaultValue: 'routine'
      },
      clinical_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      special_instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      specimen_collected_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      collected_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      collection_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      specimen_quality: {
        type: Sequelize.ENUM('good', 'fair', 'poor'),
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      results_available_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      technician_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      critical_values_notified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.addIndex('test_orders', ['order_number'], {
      unique: true,
      name: 'test_orders_order_number_unique'
    });

    await queryInterface.addIndex('test_orders', ['patient_id'], {
      name: 'test_orders_patient_id_idx'
    });

    await queryInterface.addIndex('test_orders', ['doctor_id'], {
      name: 'test_orders_doctor_id_idx'
    });

    await queryInterface.addIndex('test_orders', ['lab_test_id'], {
      name: 'test_orders_lab_test_id_idx'
    });

    await queryInterface.addIndex('test_orders', ['appointment_id'], {
      name: 'test_orders_appointment_id_idx'
    });

    await queryInterface.addIndex('test_orders', ['status'], {
      name: 'test_orders_status_idx'
    });

    await queryInterface.addIndex('test_orders', ['urgency'], {
      name: 'test_orders_urgency_idx'
    });

    await queryInterface.addIndex('test_orders', ['specimen_collected_at'], {
      name: 'test_orders_specimen_collected_at_idx'
    });

    await queryInterface.addIndex('test_orders', ['results_available_at'], {
      name: 'test_orders_results_available_at_idx'
    });

    await queryInterface.addIndex('test_orders', ['created_at'], {
      name: 'test_orders_created_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('test_orders');
  }
};