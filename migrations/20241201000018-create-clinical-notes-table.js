'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('clinical_notes', {
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
        allowNull: false,
        references: {
          model: 'doctors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      note_type: {
        type: Sequelize.ENUM('soap', 'progress', 'consultation', 'admission', 'discharge', 'procedure', 'follow_up', 'other'),
        allowNull: false,
        defaultValue: 'progress'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      chief_complaint: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      soap_note: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'SOAP note structure: {subjective, objective, assessment, plan}'
      },
      content: {
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
      prescriptions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      follow_up_instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      follow_up_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      note_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      is_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      locked_at: {
        type: Sequelize.DATE,
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
      last_modified_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    await queryInterface.addIndex('clinical_notes', ['patient_id'], {
      name: 'clinical_notes_patient_id_idx'
    });

    await queryInterface.addIndex('clinical_notes', ['appointment_id'], {
      name: 'clinical_notes_appointment_id_idx'
    });

    await queryInterface.addIndex('clinical_notes', ['doctor_id'], {
      name: 'clinical_notes_doctor_id_idx'
    });

    await queryInterface.addIndex('clinical_notes', ['note_type'], {
      name: 'clinical_notes_note_type_idx'
    });

    await queryInterface.addIndex('clinical_notes', ['note_date'], {
      name: 'clinical_notes_note_date_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('clinical_notes');
  }
};
