'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('medical_records', {
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
      record_type: {
        type: Sequelize.ENUM('encounter', 'procedure', 'diagnosis', 'immunization', 'surgery', 'hospitalization', 'emergency', 'other'),
        allowNull: false,
        defaultValue: 'encounter'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      findings: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icd10_codes: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of ICD-10 diagnosis codes'
      },
      procedures_performed: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      medications_prescribed: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lab_results: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of file URLs or references'
      },
      record_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      previous_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'medical_records',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      is_confidential: {
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('medical_records', ['patient_id'], {
      name: 'medical_records_patient_id_idx'
    });

    await queryInterface.addIndex('medical_records', ['appointment_id'], {
      name: 'medical_records_appointment_id_idx'
    });

    await queryInterface.addIndex('medical_records', ['doctor_id'], {
      name: 'medical_records_doctor_id_idx'
    });

    await queryInterface.addIndex('medical_records', ['record_type'], {
      name: 'medical_records_record_type_idx'
    });

    await queryInterface.addIndex('medical_records', ['record_date'], {
      name: 'medical_records_record_date_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('medical_records');
  }
};
