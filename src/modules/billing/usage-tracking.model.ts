import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';

@Table({
  tableName: 'usage_tracking',
  timestamps: true,
  underscored: true
})
export class UsageTracking extends Model {
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
    type: DataType.DATE,
    allowNull: false
  })
  period_start!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  period_end!: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  patients_count!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  appointments_count!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  lab_tests_count!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  storage_used_mb!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  api_calls_count!: number;

  declare createdAt: Date;
  declare updatedAt: Date;
}