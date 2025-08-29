'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hospitals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      short_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      license_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      hospital_type: {
        type: Sequelize.ENUM(
          'general',
          'specialty', 
          'clinic',
          'emergency',
          'rehabilitation',
          'psychiatric',
          'pediatric',
          'maternity'
        ),
        allowNull: false,
        defaultValue: 'general'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      emergency_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      website: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      bed_capacity: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      icu_beds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      emergency_beds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_24_hours: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      visiting_hours_start: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '08:00:00'
      },
      visiting_hours_end: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '20:00:00'
      },
      accreditation_status: {
        type: Sequelize.ENUM(
          'accredited',
          'provisional',
          'not_accredited',
          'under_review'
        ),
        allowNull: false,
        defaultValue: 'not_accredited'
      },
      accrediting_body: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      accreditation_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      accreditation_expiry: {
        type: Sequelize.DATE,
        allowNull: true
      },
      services_offered: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true
      },
      specialties: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true
      },
      contact_persons: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      operating_hours: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      tax_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      registration_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      insurance_networks: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      mission_statement: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      established_date: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('hospitals', ['license_number'], {
      unique: true,
      name: 'hospitals_license_number_unique'
    });

    await queryInterface.addIndex('hospitals', ['hospital_type'], {
      name: 'hospitals_hospital_type_idx'
    });

    await queryInterface.addIndex('hospitals', ['accreditation_status'], {
      name: 'hospitals_accreditation_status_idx'
    });

    await queryInterface.addIndex('hospitals', ['is_active'], {
      name: 'hospitals_is_active_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hospitals');
  }
};