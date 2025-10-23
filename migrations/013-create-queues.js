'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('queues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      tag_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      priority: {
        type: Sequelize.ENUM('emergency', 'delivery', 'urgent', 'normal'),
        defaultValue: 'normal',
        allowNull: false
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      arrival_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      attended: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      attended_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      room_number: {
        type: Sequelize.STRING(50),
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

    await queryInterface.addIndex('queues', ['tag_number'], { unique: true });
    await queryInterface.addIndex('queues', ['department', 'attended']);
    await queryInterface.addIndex('queues', ['priority', 'arrival_time']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('queues');
  }
};
