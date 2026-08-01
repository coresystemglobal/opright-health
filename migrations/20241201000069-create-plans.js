'use strict';

const { randomUUID } = require('crypto');

/**
 * Payments PR 1: data-driven subscription plans. Seeds the four tiers from the
 * former plan.config defaults, now with REAL per-tier feature entitlements
 * (lower tiers no longer get every feature). `all_features` is the wildcard.
 */
const PLANS = [
  { tier: 'individual', name: 'Individual', pm: 49,  py: 490,  mp: 50,  mu: 1,  ms: 512,   ma: 5000,   sort: 1, features: [] },
  { tier: 'basic',      name: 'Basic',      pm: 99,  py: 990,  mp: 100, mu: 5,  ms: 1024,  ma: 10000,  sort: 2, features: ['telemedicine'] },
  { tier: 'standard',   name: 'Standard',   pm: 299, py: 2990, mp: 500, mu: 20, ms: 5120,  ma: 50000,  sort: 3, features: ['telemedicine', 'advanced_analytics', 'workflow_automation'] },
  { tier: 'pro',        name: 'Pro',        pm: 599, py: 5990, mp: -1,  mu: -1, ms: 20480, ma: 200000, sort: 4, features: ['all_features'] }
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('plans', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tier: { type: Sequelize.ENUM('individual', 'basic', 'standard', 'pro'), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price_monthly: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      price_yearly: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'NGN' },
      max_patients: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      max_users: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      max_storage_mb: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      max_api_calls_per_month: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      features: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false, defaultValue: [] },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      paystack_plan_code_monthly: { type: Sequelize.STRING(100), allowNull: true },
      paystack_plan_code_yearly: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('plans', ['is_active'], { name: 'plans_active_idx' });

    for (const p of PLANS) {
      const featureLiteral = `{${p.features.join(',')}}`; // Postgres array literal
      await queryInterface.sequelize.query(
        `INSERT INTO plans (id, tier, name, price_monthly, price_yearly, currency, max_patients, max_users, max_storage_mb, max_api_calls_per_month, features, is_active, sort_order, created_at, updated_at)
         VALUES (:id, :tier, :name, :pm, :py, 'NGN', :mp, :mu, :ms, :ma, :features, true, :sort, NOW(), NOW())
         ON CONFLICT (tier) DO NOTHING;`,
        { replacements: { id: randomUUID(), tier: p.tier, name: p.name, pm: p.pm, py: p.py, mp: p.mp, mu: p.mu, ms: p.ms, ma: p.ma, features: featureLiteral, sort: p.sort } }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('plans');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_plans_tier";');
  }
};
