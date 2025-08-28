'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'invoices',
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
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      payment_method: {
        type: Sequelize.ENUM(
          'cash',
          'credit_card',
          'debit_card',
          'bank_transfer',
          'mobile_money',
          'insurance',
          'check',
          'online',
          'other'
        ),
        allowNull: false
      },
      payment_status: {
        type: Sequelize.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded'
        ),
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      payment_processor: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      processor_response: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reference_number: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      processing_fee_rate: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0
      },
      processing_fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      net_amount: {
        type: Sequelize.DECIMAL(12, 2),
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
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      refunded_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refund_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      refund_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Card payment specific fields
      card_last_four: {
        type: Sequelize.STRING(4),
        allowNull: true
      },
      card_brand: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      card_expiry: {
        type: Sequelize.STRING(7), // MM/YYYY
        allowNull: true
      },
      // Bank transfer specific fields
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      account_number_masked: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      // Insurance specific fields
      insurance_provider: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      policy_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      authorization_code: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      // Additional fields for payment service compatibility
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'NGN'
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'patients',
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
    await queryInterface.addIndex('payments', ['invoice_id'], {
      name: 'payments_invoice_id_idx'
    });

    await queryInterface.addIndex('payments', ['appointment_id'], {
      name: 'payments_appointment_id_idx'
    });

    await queryInterface.addIndex('payments', ['payment_method'], {
      name: 'payments_payment_method_idx'
    });

    await queryInterface.addIndex('payments', ['payment_status'], {
      name: 'payments_payment_status_idx'
    });

    await queryInterface.addIndex('payments', ['payment_date'], {
      name: 'payments_payment_date_idx'
    });

    await queryInterface.addIndex('payments', ['transaction_id'], {
      name: 'payments_transaction_id_idx'
    });

    await queryInterface.addIndex('payments', ['reference'], {
      name: 'payments_reference_idx'
    });

    await queryInterface.addIndex('payments', ['created_by'], {
      name: 'payments_created_by_idx'
    });

    await queryInterface.addIndex('payments', ['patient_id'], {
      name: 'payments_patient_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
  }
};