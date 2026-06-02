import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';

export enum PlanType {
  INDIVIDUAL = 'individual',
  BASIC = 'basic',
  STANDARD = 'standard',
  PRO = 'pro'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing'
}

@Table({
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true
})
export class Subscription extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({
    type: DataType.ENUM(...Object.values(PlanType)),
    allowNull: false
  })
  plan_type!: PlanType;

  @Column({
    type: DataType.ENUM(...Object.values(BillingCycle)),
    allowNull: false,
    defaultValue: BillingCycle.MONTHLY
  })
  billing_cycle!: BillingCycle;

  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
    allowNull: false,
    defaultValue: SubscriptionStatus.ACTIVE
  })
  status!: SubscriptionStatus;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  current_period_start!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  current_period_end!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  trial_end?: Date;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  stripe_subscription_id?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}