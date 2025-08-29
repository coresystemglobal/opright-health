'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM types first
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_users_role" AS ENUM ('patient', 'admin', 'staff', 'doctor');
    `);

    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: 'users_email_unique',
        validate: {
          isEmail: true
        }
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('patient', 'admin', 'staff', 'doctor'),
        allowNull: false,
        defaultValue: 'patient'
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      password_changed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failed_login_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true
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
    // Unique index for 'email' is now defined in the table definition above.

    await queryInterface.addIndex('users', ['username'], {
      unique: true,
      name: 'users_username_unique',
      where: {
        username: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    await queryInterface.addIndex('users', ['role'], {
      name: 'users_role_idx'
    });

    await queryInterface.addIndex('users', ['is_active'], {
      name: 'users_is_active_idx'
    });

    await queryInterface.addIndex('users', ['verified'], {
      name: 'users_verified_idx'
    });

    await queryInterface.addIndex('users', ['created_at'], {
      name: 'users_created_at_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('users', 'users_email_unique');
    await queryInterface.removeIndex('users', 'users_username_unique');
    await queryInterface.removeIndex('users', 'users_role_idx');
    await queryInterface.removeIndex('users', 'users_is_active_idx');
    await queryInterface.removeIndex('users', 'users_verified_idx');
    await queryInterface.removeIndex('users', 'users_created_at_idx');

    // Drop table
    await queryInterface.dropTable('users');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  }
};