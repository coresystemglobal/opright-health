import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';

export enum SupplyCategory {
  CONSUMABLE = 'consumable',
  PPE = 'ppe',
  REAGENT = 'reagent',
  INSTRUMENT = 'instrument',
  STATIONERY = 'stationery',
  OTHER = 'other'
}

export enum SupplyUnit {
  UNIT = 'unit',
  BOX = 'box',
  PACK = 'pack',
  PAIR = 'pair',
  ROLL = 'roll',
  BOTTLE = 'bottle',
  LITRE = 'litre',
  PIECE = 'piece'
}

/**
 * A quantity-tracked medical supply (gloves, syringes, gauze, reagents…).
 * on_hand is kept in sync with the supply_movements ledger.
 */
@Table({
  tableName: 'supply_items',
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
export class SupplyItem extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  sku!: string;

  @Column({ type: DataType.ENUM(...Object.values(SupplyCategory)), allowNull: false, defaultValue: SupplyCategory.CONSUMABLE })
  category!: SupplyCategory;

  @Column({ type: DataType.ENUM(...Object.values(SupplyUnit)), allowNull: false, defaultValue: SupplyUnit.UNIT })
  unit!: SupplyUnit;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, comment: 'Current quantity on hand' })
  on_hand!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, comment: 'Low-stock threshold' })
  reorder_level!: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  unit_price!: number;

  @Column({ type: DataType.STRING(200), allowNull: true })
  supplier?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_low_stock(): boolean {
    return this.on_hand <= this.reorder_level;
  }
}
