'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('resources', {
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
      resource_type: {
        type: Sequelize.ENUM('examination_room', 'operating_room', 'procedure_room', 'consultation_room', 'meeting_room', 'medical_equipment', 'diagnostic_equipment', 'other'),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('available', 'in_use', 'maintenance', 'out_of_service', 'reserved'),
        allowNull: false,
        defaultValue: 'available'
      },
      location: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      floor: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      building: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Capacity/seats for rooms'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      requires_approval: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      features: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional features/amenities'
      },
      available_from: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '08:00:00'
      },
      available_until: {
        type: Sequelize.TIME,
        allowNull: true,
        defaultValue: '18:00:00'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      last_maintenance_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      next_maintenance_due: {
        type: Sequelize.DATEONLY,
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
    await queryInterface.addIndex('resources', ['department_id'], {
      name: 'resources_department_id_idx'
    });

    await queryInterface.addIndex('resources', ['resource_type'], {
      name: 'resources_resource_type_idx'
    });

    await queryInterface.addIndex('resources', ['status'], {
      name: 'resources_status_idx'
    });

    await queryInterface.addIndex('resources', ['is_active'], {
      name: 'resources_is_active_idx'
    });

    await queryInterface.addIndex('resources', ['code', 'tenant_id'], {
      unique: true,
      name: 'resources_code_tenant_id_unique_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('resources');
  }
};
