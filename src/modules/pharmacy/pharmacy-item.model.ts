import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { StockBatch } from '@modules/pharmacy/stock-batch.model';

export enum DrugForm {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  SYRUP = 'syrup',
  INJECTION = 'injection',
  OINTMENT = 'ointment',
  DROPS = 'drops',
  INHALER = 'inhaler',
  SUPPOSITORY = 'suppository',
  POWDER = 'powder',
  OTHER = 'other'
}

export enum StockUnit {
  UNIT = 'unit',
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  ML = 'ml',
  VIAL = 'vial',
  AMPOULE = 'ampoule',
  SACHET = 'sachet',
  BOTTLE = 'bottle',
  TUBE = 'tube',
  OTHER = 'other'
}

@Table({
  tableName: 'pharmacy_items',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['category'] },
    { fields: ['sku', 'tenant_id'], unique: true }
  ]
})
export class PharmacyItem extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  generic_name?: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  sku!: string;

  @Column({ type: DataType.ENUM(...Object.values(DrugForm)), allowNull: false, defaultValue: DrugForm.TABLET })
  form!: DrugForm;

  @Column({ type: DataType.STRING(50), allowNull: true })
  strength?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  category?: string;

  @Column({ type: DataType.ENUM(...Object.values(StockUnit)), allowNull: false, defaultValue: StockUnit.UNIT })
  unit!: StockUnit;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  unit_price!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, comment: 'Low-stock threshold' })
  reorder_level!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @HasMany(() => StockBatch)
  batches?: StockBatch[];

  declare createdAt: Date;
  declare updatedAt: Date;
}
