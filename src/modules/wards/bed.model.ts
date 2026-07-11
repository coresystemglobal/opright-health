import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Ward } from '@modules/wards/ward.model';
import { Tenant } from '@modules/tenancy/tenant.model';

export enum BedType {
  STANDARD = 'standard',
  ICU = 'icu',
  PEDIATRIC = 'pediatric',
  MATERNITY = 'maternity',
  BARIATRIC = 'bariatric'
}

export enum BedStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
  BLOCKED = 'blocked'
}

/** Statuses a bed must be in to accept a new admission. */
export const ASSIGNABLE_BED_STATUSES = [BedStatus.AVAILABLE, BedStatus.RESERVED];

@Table({
  tableName: 'beds',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['ward_id'] },
    { fields: ['status'] },
    { fields: ['ward_id', 'bed_number'], unique: true }
  ]
})
export class Bed extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Ward)
  @Column({ type: DataType.UUID, allowNull: false })
  ward_id!: string;

  @BelongsTo(() => Ward)
  ward?: Ward;

  @Column({ type: DataType.STRING(30), allowNull: false })
  bed_number!: string;

  @Column({ type: DataType.ENUM(...Object.values(BedType)), allowNull: false, defaultValue: BedType.STANDARD })
  bed_type!: BedType;

  @Column({ type: DataType.ENUM(...Object.values(BedStatus)), allowNull: false, defaultValue: BedStatus.AVAILABLE })
  status!: BedStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_assignable(): boolean {
    return this.is_active && ASSIGNABLE_BED_STATUSES.includes(this.status);
  }
}
