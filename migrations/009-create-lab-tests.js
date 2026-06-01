'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lab_tests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      test_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      test_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM(
          'blood_test',
          'urine_test',
          'stool_test',
          'imaging',
          'pathology',
          'microbiology',
          'biochemistry',
          'hematology',
          'immunology',
          'molecular',
          'cytology',
          'histopathology'
        ),
        allowNull: false
      },
      specimen_type: {
        type: Sequelize.ENUM(
          'blood',
          'serum',
          'plasma',
          'urine',
          'stool',
          'sputum',
          'tissue',
          'swab',
          'fluid',
          'biopsy'
        ),
        allowNull: false
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
        allowNull: false,
        defaultValue: 'laboratory'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      turnaround_time_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 24,
        validate: {
          min: 1
        }
      },
      preparation_instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fasting_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      special_requirements: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reference_ranges: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      is_active: {
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
    await queryInterface.addIndex('lab_tests', ['test_code'], {
      unique: true,
      name: 'lab_tests_test_code_unique'
    });

    await queryInterface.addIndex('lab_tests', ['category'], {
      name: 'lab_tests_category_idx'
    });

    await queryInterface.addIndex('lab_tests', ['department'], {
      name: 'lab_tests_department_idx'
    });

    await queryInterface.addIndex('lab_tests', ['specimen_type'], {
      name: 'lab_tests_specimen_type_idx'
    });

    await queryInterface.addIndex('lab_tests', ['is_active'], {
      name: 'lab_tests_is_active_idx'
    });

    await queryInterface.addIndex('lab_tests', ['price'], {
      name: 'lab_tests_price_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('lab_tests');
  }
};