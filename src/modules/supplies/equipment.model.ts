import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Department } from '@modules/hospital/department.model';

export enum EquipmentCategory {
  DIAGNOSTIC = 'diagnostic',
  THERAPEUTIC = 'therapeutic',
  MONITORING = 'monitoring',
  SURGICAL = 'surgical',
  MOBILITY = 'mobility',
  LABORATORY = 'laboratory',
  IT = 'it',
  OTHER = 'other'
}

export enum EquipmentStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  UNDER_MAINTENANCE = 'under_maintenance',
  RETIRED = 'retired',
  LOST = 'lost'
}

/** An individually tracked equipment asset (not quantity-based). */
@Table({
  tableName: 'equipment',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['department_id'] },
    { fields: ['asset_code', 'tenant_id'], unique: true }
  ]
})
export class Equipment extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  asset_code!: string;

  @Column({ type: DataType.ENUM(...Object.values(EquipmentCategory)), allowNull: false, defaultValue: EquipmentCategory.OTHER })
  category!: EquipmentCategory;

  @Column({ type: DataType.ENUM(...Object.values(EquipmentStatus)), allowNull: false, defaultValue: EquipmentStatus.AVAILABLE })
  status!: EquipmentStatus;

  @Column({ type: DataType.STRING(100), allowNull: true })
  serial_number?: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  manufacturer?: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  model?: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  location?: string;

  @ForeignKey(() => Department)
  @Column({ type: DataType.UUID, allowNull: true })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  purchase_date?: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  purchase_cost?: number;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  warranty_expiry?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  last_maintenance_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  next_maintenance_at?: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  get maintenance_due(): boolean {
    return !!this.next_maintenance_at && new Date(this.next_maintenance_at) <= new Date();
  }
}
