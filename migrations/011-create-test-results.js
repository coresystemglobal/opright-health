'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('test_results', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      test_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'test_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parameter_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      numeric_value: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: true
      },
      units: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      reference_range: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('normal', 'abnormal', 'critical', 'inconclusive', 'pending'),
        allowNull: false,
        defaultValue: 'pending'
      },
      is_critical: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      flags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      performed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      performed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      equipment_used: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      method: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      dilution_factor: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        defaultValue: 1.0
      },
      quality_control_passed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.addIndex('test_results', ['test_order_id'], {
      name: 'test_results_test_order_id_idx'
    });

    await queryInterface.addIndex('test_results', ['parameter_name'], {
      name: 'test_results_parameter_name_idx'
    });

    await queryInterface.addIndex('test_results', ['status'], {
      name: 'test_results_status_idx'
    });

    await queryInterface.addIndex('test_results', ['is_critical'], {
      name: 'test_results_is_critical_idx'
    });

    await queryInterface.addIndex('test_results', ['performed_at'], {
      name: 'test_results_performed_at_idx'
    });

    await queryInterface.addIndex('test_results', ['numeric_value'], {
      name: 'test_results_numeric_value_idx'
    });

    // Composite index for test order and parameter
    await queryInterface.addIndex('test_results', ['test_order_id', 'parameter_name'], {
      unique: true,
      name: 'test_results_order_parameter_unique',
      where: {
        deleted_at: null
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('test_results');
  }
};