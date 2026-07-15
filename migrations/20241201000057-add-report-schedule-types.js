'use strict';

/**
 * Add the prescription-dispensing, waitlist-no-show, and insurance-claims
 * report types to the report_schedules.report_type enum so they can be used
 * in configurable scheduled digests.
 *
 * Postgres cannot DROP an enum value, so `down` is a no-op — the extra values
 * are harmless if left in place.
 */
module.exports = {
  up: async (queryInterface) => {
    const enumType = 'enum_report_schedules_report_type';
    const values = ['prescription-dispensing', 'waitlist-no-show', 'insurance-claims'];
    for (const value of values) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }
  },

  down: async () => {
    // Postgres does not support removing enum values; no-op.
  }
};
