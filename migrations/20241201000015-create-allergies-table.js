'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('allergies', {
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
      allergen_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      allergen_type: {
        type: Sequelize.ENUM('food', 'medication', 'environmental', 'insect', 'latex', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      severity: {
        type: Sequelize.ENUM('mild', 'moderate', 'severe', 'life_threatening'),
        allowNull: false,
        defaultValue: 'mild'
      },
      reaction: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      symptoms: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      treatment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      onset_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('allergies', ['patient_id'], {
      name: 'allergies_patient_id_idx'
    });

    await queryInterface.addIndex('allergies', ['allergen_type'], {
      name: 'allergies_allergen_type_idx'
    });

    await queryInterface.addIndex('allergies', ['severity'], {
      name: 'allergies_severity_idx'
    });

    await queryInterface.addIndex('allergies', ['is_active'], {
      name: 'allergies_is_active_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('allergies');
  }
};
