import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { PlanType } from '@modules/billing/subscription.model';

/**
 * Subscription plan catalogue — the data-driven source of pricing, capacity
 * limits, and feature entitlements per tier. Previously these lived only in
 * `plan.config.ts`; that config is now the seed + fallback, and `BillingService`
 * loads this table into its in-memory cache. One row per `tier`.
 *
 * `features` gates capabilities per tier (the `all_features` wildcard grants
 * everything). A limit of `-1` means unlimited.
 */
@Table({
  tableName: 'plans',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { unique: true, fields: ['tier'] },
    { fields: ['is_active'] }
  ]
})
export class Plan extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.ENUM(...Object.values(PlanType)), allowNull: false, unique: true })
  tier!: PlanType;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  price_monthly!: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  price_yearly!: number;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'NGN' })
  currency!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, comment: '-1 = unlimited' })
  max_patients!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, comment: '-1 = unlimited' })
  max_users!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  max_storage_mb!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  max_api_calls_per_month!: number;

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: false, defaultValue: [] })
  features!: string[];

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sort_order!: number;

  // Paystack plan codes (populated when subscriptions are wired in PR 2).
  @Column({ type: DataType.STRING(100), allowNull: true })
  paystack_plan_code_monthly?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  paystack_plan_code_yearly?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}
