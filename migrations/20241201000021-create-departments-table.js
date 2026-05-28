'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('departments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      head_of_department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'doctors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      operating_hours_start: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '08:00:00'
      },
      operating_hours_end: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '18:00:00'
      },
      bed_capacity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total bed capacity for inpatient departments'
      },
      beds_occupied: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Currently occupied beds'
      },
      location: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      floor: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      phone_extension: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true
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
    await queryInterface.addIndex('departments', ['code', 'tenant_id'], {
      unique: true,
      name: 'departments_code_tenant_id_unique_idx'
    });

    await queryInterface.addIndex('departments', ['name'], {
      name: 'departments_name_idx'
    });

    await queryInterface.addIndex('departments', ['is_active'], {
      name: 'departments_is_active_idx'
    });

    await queryInterface.addIndex('departments', ['head_of_department_id'], {
      name: 'departments_head_of_department_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('departments');
  }
};
