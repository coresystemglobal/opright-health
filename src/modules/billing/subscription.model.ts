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

  // A downgrade scheduled to take effect at the next renewal (applied by the
  // webhook/cron on charge.success).
  @Column({
    type: DataType.ENUM(...Object.values(PlanType)),
    allowNull: true
  })
  pending_plan_type?: PlanType;

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

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  paystack_subscription_code?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  cancelled_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  grace_period_ends_at?: Date;

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_trialing(): boolean {
    return (
      this.status === SubscriptionStatus.TRIALING &&
      !!this.trial_end &&
      new Date(this.trial_end) > new Date()
    );
  }

  get trial_days_remaining(): number {
    if (!this.is_trialing || !this.trial_end) return 0;
    return Math.max(0, Math.ceil((new Date(this.trial_end).getTime() - Date.now()) / 86_400_000));
  }

  get is_in_grace_period(): boolean {
    return (
      this.status === SubscriptionStatus.PAST_DUE &&
      !!this.grace_period_ends_at &&
      new Date(this.grace_period_ends_at) > new Date()
    );
  }

  get grace_days_remaining(): number {
    if (!this.is_in_grace_period || !this.grace_period_ends_at) return 0;
    return Math.max(0, Math.ceil((new Date(this.grace_period_ends_at).getTime() - Date.now()) / 86_400_000));
  }

  get is_access_allowed(): boolean {
    return (
      this.status === SubscriptionStatus.ACTIVE ||
      this.is_trialing ||
      this.is_in_grace_period
    );
  }
}