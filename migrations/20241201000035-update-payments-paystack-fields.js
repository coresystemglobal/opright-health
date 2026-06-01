'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make invoice_id nullable (supports payments before invoice creation)
    await queryInterface.changeColumn('payments', 'invoice_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'invoices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add currency field (primary: NGN for Nigeria)
    await queryInterface.addColumn('payments', 'currency', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'NGN'
    });

    // Add index on reference_number for fast webhook lookups
    await queryInterface.addIndex('payments', ['reference_number'], {
      name: 'payments_reference_number_idx',
      unique: true,
      where: { reference_number: { [Sequelize.Op.ne]: null } }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('payments', 'payments_reference_number_idx');
    await queryInterface.removeColumn('payments', 'currency');
    await queryInterface.changeColumn('payments', 'invoice_id', {
      type: Sequelize.UUID,
      allowNull: false
    });
  }
};
