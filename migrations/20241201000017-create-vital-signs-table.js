'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vital_signs', {
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
      temperature: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Temperature in Fahrenheit'
      },
      heart_rate: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Heart rate in beats per minute'
      },
      blood_pressure_systolic: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Systolic blood pressure in mmHg'
      },
      blood_pressure_diastolic: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Diastolic blood pressure in mmHg'
      },
      respiratory_rate: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Respiratory rate per minute'
      },
      oxygen_saturation: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Oxygen saturation percentage'
      },
      height: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Height in centimeters'
      },
      weight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Weight in kilograms'
      },
      bmi: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Body Mass Index'
      },
      blood_glucose: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Blood glucose in mg/dL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      recorded_by: {
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
      }
    });

    // Add indexes
    await queryInterface.addIndex('vital_signs', ['patient_id'], {
      name: 'vital_signs_patient_id_idx'
    });

    await queryInterface.addIndex('vital_signs', ['appointment_id'], {
      name: 'vital_signs_appointment_id_idx'
    });

    await queryInterface.addIndex('vital_signs', ['recorded_at'], {
      name: 'vital_signs_recorded_at_idx'
    });

    await queryInterface.addIndex('vital_signs', ['recorded_by'], {
      name: 'vital_signs_recorded_by_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vital_signs');
  }
};
