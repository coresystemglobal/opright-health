/**
 * Migration: Add Individual Plan Type to Subscriptions
 * 
 * This migration adds support for the new 'individual' plan type
 * to the existing subscriptions table enum.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update the plan_type enum to include 'individual'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_subscriptions_plan_type" 
      ADD VALUE IF NOT EXISTS 'individual' BEFORE 'basic';
    `);
    
    console.log('✓ Added "individual" plan type to subscriptions table');
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and updating all references
    // For safety, we'll just log a warning
    console.warn('⚠ Warning: Cannot remove enum value "individual" from PostgreSQL enum.');
    console.warn('⚠ If rollback is needed, manual intervention required.');
    console.warn('⚠ Ensure no subscriptions use "individual" plan type before attempting rollback.');
  }
};
