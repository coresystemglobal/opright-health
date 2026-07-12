import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';
import { PharmacyItem } from '@modules/pharmacy/pharmacy-item.model';
import { StockBatch } from '@modules/pharmacy/stock-batch.model';

export enum MovementType {
  RECEIPT = 'receipt',        // stock in (new batch or top-up)
  DISPENSE = 'dispense',      // stock out to a patient / prescription
  ADJUSTMENT = 'adjustment',  // manual correction (+/-)
  WASTAGE = 'wastage',        // expired / damaged write-off
  RETURN = 'return'           // returned to stock
}

/**
 * Immutable audit trail of every stock change. `quantity` is signed:
 * positive for stock in (receipt/return), negative for stock out
 * (dispense/wastage); adjustment may be either.
 */
@Table({
  tableName: 'stock_movements',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['pharmacy_item_id'] },
    { fields: ['batch_id'] },
    { fields: ['movement_type'] },
    { fields: ['created_at'] }
  ]
})
export class StockMovement extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => PharmacyItem)
  @Column({ type: DataType.UUID, allowNull: false })
  pharmacy_item_id!: string;

  @BelongsTo(() => PharmacyItem)
  item?: PharmacyItem;

  @ForeignKey(() => StockBatch)
  @Column({ type: DataType.UUID, allowNull: true })
  batch_id?: string;

  @BelongsTo(() => StockBatch)
  batch?: StockBatch;

  @Column({ type: DataType.ENUM(...Object.values(MovementType)), allowNull: false })
  movement_type!: MovementType;

  @Column({ type: DataType.INTEGER, allowNull: false, comment: 'Signed: + in, - out' })
  quantity!: number;

  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'Item total on-hand after this movement' })
  balance_after?: number;

  @Column({ type: DataType.STRING(500), allowNull: true })
  reason?: string;

  // Optional link back to the source (e.g. a prescription)
  @Column({ type: DataType.STRING(40), allowNull: true })
  reference_type?: string;

  @Column({ type: DataType.UUID, allowNull: true })
  reference_id?: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  performed_by!: string;

  @BelongsTo(() => User, 'performed_by')
  performer?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
