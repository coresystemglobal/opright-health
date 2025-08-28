'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('doctors', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      specialization: {
        type: Sequelize.ENUM(
          'general_medicine',
          'cardiology',
          'dermatology',
          'endocrinology',
          'gastroenterology',
          'hematology',
          'infectious_disease',
          'nephrology',
          'neurology',
          'oncology',
          'orthopedics',
          'pediatrics',
          'psychiatry',
          'pulmonology',
          'radiology',
          'surgery',
          'urology',
          'gynecology',
          'ophthalmology',
          'ent'
        ),
        allowNull: false
      },
      license_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      consultation_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      experience_years: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      qualification: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      department: {
        type: Sequelize.ENUM(
          'emergency',
          'icu',
          'outpatient',
          'surgery',
          'pediatrics',
          'maternity',
          'cardiology',
          'oncology',
          'radiology',
          'laboratory'
        ),
        allowNull: true
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      working_hours_start: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '09:00:00'
      },
      working_hours_end: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '17:00:00'
      },
      working_days: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true,
        defaultValue: [1, 2, 3, 4, 5] // Monday to Friday
      },
      appointment_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 30
      },
      max_appointments_per_day: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 20
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
    await queryInterface.addIndex('doctors', ['license_number'], {
      unique: true,
      name: 'doctors_license_number_unique'
    });

    await queryInterface.addIndex('doctors', ['specialization'], {
      name: 'doctors_specialization_idx'
    });

    await queryInterface.addIndex('doctors', ['department'], {
      name: 'doctors_department_idx'
    });

    await queryInterface.addIndex('doctors', ['is_available'], {
      name: 'doctors_is_available_idx'
    });

    await queryInterface.addIndex('doctors', ['user_id'], {
      name: 'doctors_user_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('doctors');
  }
};