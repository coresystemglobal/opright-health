'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // supply_items (consumable catalogue)
    await queryInterface.createTable('supply_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      sku: { type: Sequelize.STRING(50), allowNull: false },
      category: {
        type: Sequelize.ENUM('consumable', 'ppe', 'reagent', 'instrument', 'stationery', 'other'),
        allowNull: false,
        defaultValue: 'consumable'
      },
      unit: {
        type: Sequelize.ENUM('unit', 'box', 'pack', 'pair', 'roll', 'bottle', 'litre', 'piece'),
        allowNull: false,
        defaultValue: 'unit'
      },
      on_hand: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      supplier: { type: Sequelize.STRING(200), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('supply_items', ['tenant_id'], { name: 'supply_items_tenant_id_idx' });
    await queryInterface.addIndex('supply_items', ['category'], { name: 'supply_items_category_idx' });
    await queryInterface.addIndex('supply_items', ['sku', 'tenant_id'], { name: 'supply_items_sku_tenant_unique', unique: true });

    // supply_movements (audit ledger)
    await queryInterface.createTable('supply_movements', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      supply_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'supply_items', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      movement_type: {
        type: Sequelize.ENUM('receipt', 'issue', 'adjustment', 'wastage', 'return'),
        allowNull: false
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      balance_after: { type: Sequelize.INTEGER, allowNull: true },
      department_id: { type: Sequelize.UUID, allowNull: true },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      performed_by: { type: Sequelize.UUID, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex('supply_movements', ['tenant_id'], { name: 'supply_movements_tenant_id_idx' });
    await queryInterface.addIndex('supply_movements', ['supply_item_id'], { name: 'supply_movements_item_id_idx' });
    await queryInterface.addIndex('supply_movements', ['movement_type'], { name: 'supply_movements_type_idx' });

    // equipment (asset register)
    await queryInterface.createTable('equipment', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      asset_code: { type: Sequelize.STRING(50), allowNull: false },
      category: {
        type: Sequelize.ENUM('diagnostic', 'therapeutic', 'monitoring', 'surgical', 'mobility', 'laboratory', 'it', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      status: {
        type: Sequelize.ENUM('available', 'in_use', 'under_maintenance', 'retired', 'lost'),
        allowNull: false,
        defaultValue: 'available'
      },
      serial_number: { type: Sequelize.STRING(100), allowNull: true },
      manufacturer: { type: Sequelize.STRING(150), allowNull: true },
      model: { type: Sequelize.STRING(150), allowNull: true },
      location: { type: Sequelize.STRING(150), allowNull: true },
      department_id: { type: Sequelize.UUID, allowNull: true },
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      warranty_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      last_maintenance_at: { type: Sequelize.DATE, allowNull: true },
      next_maintenance_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('equipment', ['tenant_id'], { name: 'equipment_tenant_id_idx' });
    await queryInterface.addIndex('equipment', ['category'], { name: 'equipment_category_idx' });
    await queryInterface.addIndex('equipment', ['status'], { name: 'equipment_status_idx' });
    await queryInterface.addIndex('equipment', ['department_id'], { name: 'equipment_department_id_idx' });
    await queryInterface.addIndex('equipment', ['asset_code', 'tenant_id'], { name: 'equipment_asset_code_tenant_unique', unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('equipment');
    await queryInterface.dropTable('supply_movements');
    await queryInterface.dropTable('supply_items');
  }
};
