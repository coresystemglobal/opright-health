'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM types
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_patients_gender" AS ENUM ('male', 'female', 'other');
    `);

    // Create patients table
    await queryInterface.createTable('patients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      mrn: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      emergency_contact_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      emergency_contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('patients', ['mrn'], {
      unique: true,
      name: 'patients_mrn_unique'
    });

    await queryInterface.addIndex('patients', ['email'], {
      name: 'patients_email_idx'
    });

    await queryInterface.addIndex('patients', ['phone'], {
      name: 'patients_phone_idx'
    });

    await queryInterface.addIndex('patients', ['first_name', 'last_name'], {
      name: 'patients_name_idx'
    });

    await queryInterface.addIndex('patients', ['date_of_birth'], {
      name: 'patients_dob_idx'
    });

    await queryInterface.addIndex('patients', ['user_id'], {
      name: 'patients_user_id_idx'
    });

    await queryInterface.addIndex('patients', ['created_at'], {
      name: 'patients_created_at_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.removeIndex('patients', 'patients_mrn_unique');
    await queryInterface.removeIndex('patients', 'patients_email_idx');
    await queryInterface.removeIndex('patients', 'patients_phone_idx');
    await queryInterface.removeIndex('patients', 'patients_name_idx');
    await queryInterface.removeIndex('patients', 'patients_dob_idx');
    await queryInterface.removeIndex('patients', 'patients_user_id_idx');
    await queryInterface.removeIndex('patients', 'patients_created_at_idx');

    // Drop table
    await queryInterface.dropTable('patients');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_patients_gender";');
  }
};