'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ambulances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      vehicle_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('available', 'en_route', 'at_scene', 'transporting', 'at_hospital', 'maintenance'),
        defaultValue: 'available',
        allowNull: false
      },
      driver_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      driver_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      current_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      current_longitude: {
        type: Sequelize.DECIMAL(11, 8),
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
      }
    });

    await queryInterface.createTable('ambulance_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ambulance_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ambulances',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      pickup_location: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      pickup_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      pickup_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      emergency_details: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      emergency_level: {
        type: Sequelize.ENUM('critical', 'high', 'medium', 'low'),
        defaultValue: 'medium',
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'dispatched', 'arrived', 'transporting', 'completed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
      },
      caller_phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      dispatched_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      arrived_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      eta_minutes: {
        type: Sequelize.INTEGER,
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
      }
    });

    await queryInterface.addIndex('ambulance_requests', ['status']);
    await queryInterface.addIndex('ambulance_requests', ['emergency_level']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ambulance_requests');
    await queryInterface.dropTable('ambulances');
  }
};
