'use strict';

// AES-256-GCM ciphertext (iv:tag:ciphertext, hex) is longer than the
// plaintext, so the encrypted VARCHAR PII columns on patients are widened to
// TEXT. address is already TEXT; the encrypted clinical fields on appointments
// and clinical_notes are already TEXT.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('patients', 'phone', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.changeColumn('patients', 'emergency_contact_name', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.changeColumn('patients', 'emergency_contact_phone', { type: Sequelize.TEXT, allowNull: true });
  },

  down: async (queryInterface, Sequelize) => {
    // Note: rows written after encryption hold ciphertext longer than these
    // limits; only run down after decrypting/clearing those columns.
    await queryInterface.changeColumn('patients', 'phone', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.changeColumn('patients', 'emergency_contact_name', { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.changeColumn('patients', 'emergency_contact_phone', { type: Sequelize.STRING(20), allowNull: true });
  }
};
