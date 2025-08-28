'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      invoice_number: {
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
      invoice_type: {
        type: Sequelize.ENUM(
          'consultation',
          'procedure',
          'emergency',
          'diagnostic',
          'pharmacy',
          'other'
        ),
        allowNull: false,
        defaultValue: 'consultation'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0
      },
      tax_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      paid_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      payment_status: {
        type: Sequelize.ENUM(
          'pending',
          'partial',
          'paid',
          'overdue',
          'cancelled',
          'refunded'
        ),
        allowNull: false,
        defaultValue: 'pending'
      },
      invoice_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      line_items: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      billing_address: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      reference_number: {
        type: Sequelize.STRING(100),
        allowNull: true
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
    await queryInterface.addIndex('invoices', ['invoice_number'], {
      unique: true,
      name: 'invoices_invoice_number_unique'
    });

    await queryInterface.addIndex('invoices', ['patient_id'], {
      name: 'invoices_patient_id_idx'
    });

    await queryInterface.addIndex('invoices', ['doctor_id'], {
      name: 'invoices_doctor_id_idx'
    });

    await queryInterface.addIndex('invoices', ['appointment_id'], {
      name: 'invoices_appointment_id_idx'
    });

    await queryInterface.addIndex('invoices', ['payment_status'], {
      name: 'invoices_payment_status_idx'
    });

    await queryInterface.addIndex('invoices', ['invoice_date'], {
      name: 'invoices_invoice_date_idx'
    });

    await queryInterface.addIndex('invoices', ['due_date'], {
      name: 'invoices_due_date_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('invoices');
  }
};