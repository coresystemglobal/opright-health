'use strict';

// Links a prescription line item to a pharmacy catalogue item so dispensing
// can decrement real stock.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('prescription_items');
    if (!table.pharmacy_item_id) {
      await queryInterface.addColumn('prescription_items', 'pharmacy_item_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'pharmacy_items', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('prescription_items', ['pharmacy_item_id'], {
        name: 'prescription_items_pharmacy_item_id_idx'
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('prescription_items');
    if (table.pharmacy_item_id) {
      await queryInterface.removeIndex('prescription_items', 'prescription_items_pharmacy_item_id_idx').catch(() => {});
      await queryInterface.removeColumn('prescription_items', 'pharmacy_item_id');
    }
  }
};
