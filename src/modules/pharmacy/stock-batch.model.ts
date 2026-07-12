import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { PharmacyItem } from '@modules/pharmacy/pharmacy-item.model';

/**
 * A received lot of a pharmacy item, with its own expiry and quantity.
 * Batch-level tracking enables FEFO dispensing and expiry alerts.
 */
@Table({
  tableName: 'stock_batches',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['pharmacy_item_id'] },
    { fields: ['expiry_date'] },
    { fields: ['pharmacy_item_id', 'batch_number'], unique: true }
  ]
})
export class StockBatch extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => PharmacyItem)
  @Column({ type: DataType.UUID, allowNull: false })
  pharmacy_item_id!: string;

  @BelongsTo(() => PharmacyItem)
  item?: PharmacyItem;

  @Column({ type: DataType.STRING(60), allowNull: false })
  batch_number!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  quantity!: number;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expiry_date?: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  cost_price?: number;

  @Column({ type: DataType.STRING(200), allowNull: true })
  supplier?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  received_at!: Date;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_expired(): boolean {
    return !!this.expiry_date && new Date(this.expiry_date) < new Date();
  }
}
