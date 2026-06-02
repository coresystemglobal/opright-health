import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';
import { TriageRiskLevel, TriageSessionStatus } from '@appTypes/triage.types';

@Table({
  tableName: 'triage_sessions',
  timestamps: true,
  underscored: true,
  paranoid: false,
  freezeTableName: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['tenant_id'] },
    { fields: ['status'] }
  ]
})
export class TriageSession extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id!: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({ type: DataType.ENUM('in_progress', 'completed', 'abandoned'), allowNull: false, defaultValue: 'in_progress' })
  status!: TriageSessionStatus;

  @Column({ type: DataType.STRING(200), allowNull: false })
  primary_symptom!: string;

  @Column({ type: DataType.ENUM('low', 'moderate', 'urgent', 'emergency'), allowNull: true })
  risk_level?: TriageRiskLevel;

  @Column({ type: DataType.TEXT, allowNull: true })
  recommended_action?: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  score?: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  started_at!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completed_at?: Date;
}
