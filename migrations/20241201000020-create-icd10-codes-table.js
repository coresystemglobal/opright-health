'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('icd10_codes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      chapter: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      is_billable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      parent_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Parent code for hierarchy'
      },
      search_vector: {
        type: Sequelize.TSVECTOR,
        allowNull: true,
        comment: 'Full-text search vector'
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

    // Add indexes
    await queryInterface.addIndex('icd10_codes', ['code'], {
      unique: true,
      name: 'icd10_codes_code_unique_idx'
    });

    await queryInterface.addIndex('icd10_codes', ['category'], {
      name: 'icd10_codes_category_idx'
    });

    await queryInterface.addIndex('icd10_codes', ['is_billable'], {
      name: 'icd10_codes_is_billable_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('icd10_codes');
  }
};
