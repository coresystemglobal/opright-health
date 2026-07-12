'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // pharmacy_items (drug catalogue)
    await queryInterface.createTable('pharmacy_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      generic_name: { type: Sequelize.STRING(200), allowNull: true },
      sku: { type: Sequelize.STRING(50), allowNull: false },
      form: {
        type: Sequelize.ENUM('tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'),
        allowNull: false,
        defaultValue: 'tablet'
      },
      strength: { type: Sequelize.STRING(50), allowNull: true },
      category: { type: Sequelize.STRING(100), allowNull: true },
      unit: {
        type: Sequelize.ENUM('unit', 'tablet', 'capsule', 'ml', 'vial', 'ampoule', 'sachet', 'bottle', 'tube', 'other'),
        allowNull: false,
        defaultValue: 'unit'
      },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('pharmacy_items', ['tenant_id'], { name: 'pharmacy_items_tenant_id_idx' });
    await queryInterface.addIndex('pharmacy_items', ['category'], { name: 'pharmacy_items_category_idx' });
    await queryInterface.addIndex('pharmacy_items', ['sku', 'tenant_id'], { name: 'pharmacy_items_sku_tenant_unique', unique: true });

    // stock_batches
    await queryInterface.createTable('stock_batches', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      pharmacy_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'pharmacy_items', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      batch_number: { type: Sequelize.STRING(60), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      cost_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      supplier: { type: Sequelize.STRING(200), allowNull: true },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('stock_batches', ['tenant_id'], { name: 'stock_batches_tenant_id_idx' });
    await queryInterface.addIndex('stock_batches', ['pharmacy_item_id'], { name: 'stock_batches_item_id_idx' });
    await queryInterface.addIndex('stock_batches', ['expiry_date'], { name: 'stock_batches_expiry_idx' });
    await queryInterface.addIndex('stock_batches', ['pharmacy_item_id', 'batch_number'], { name: 'stock_batches_item_batch_unique', unique: true });

    // stock_movements (audit trail)
    await queryInterface.createTable('stock_movements', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      pharmacy_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'pharmacy_items', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      batch_id: { type: Sequelize.UUID, allowNull: true },
      movement_type: {
        type: Sequelize.ENUM('receipt', 'dispense', 'adjustment', 'wastage', 'return'),
        allowNull: false
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      balance_after: { type: Sequelize.INTEGER, allowNull: true },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      reference_type: { type: Sequelize.STRING(40), allowNull: true },
      reference_id: { type: Sequelize.UUID, allowNull: true },
      performed_by: { type: Sequelize.UUID, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('stock_movements', ['tenant_id'], { name: 'stock_movements_tenant_id_idx' });
    await queryInterface.addIndex('stock_movements', ['pharmacy_item_id'], { name: 'stock_movements_item_id_idx' });
    await queryInterface.addIndex('stock_movements', ['batch_id'], { name: 'stock_movements_batch_id_idx' });
    await queryInterface.addIndex('stock_movements', ['movement_type'], { name: 'stock_movements_type_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('stock_movements');
    await queryInterface.dropTable('stock_batches');
    await queryInterface.dropTable('pharmacy_items');
  }
};
