import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';
import { Department } from '@modules/hospital/department.model';
import { SupplyItem } from '@modules/supplies/supply-item.model';

export enum SupplyMovementType {
  RECEIPT = 'receipt',        // stock in
  ISSUE = 'issue',            // issued to a department/ward
  ADJUSTMENT = 'adjustment',  // manual correction (+/-)
  WASTAGE = 'wastage',        // damaged / expired write-off
  RETURN = 'return'           // returned to store
}

/**
 * Immutable audit trail of supply stock changes. `quantity` is signed:
 * positive in (receipt/return), negative out (issue/wastage); adjustment
 * either way.
 */
@Table({
  tableName: 'supply_movements',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['supply_item_id'] },
    { fields: ['movement_type'] },
    { fields: ['created_at'] }
  ]
})
export class SupplyMovement extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => SupplyItem)
  @Column({ type: DataType.UUID, allowNull: false })
  supply_item_id!: string;

  @BelongsTo(() => SupplyItem)
  item?: SupplyItem;

  @Column({ type: DataType.ENUM(...Object.values(SupplyMovementType)), allowNull: false })
  movement_type!: SupplyMovementType;

  @Column({ type: DataType.INTEGER, allowNull: false, comment: 'Signed: + in, - out' })
  quantity!: number;

  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'On-hand after this movement' })
  balance_after?: number;

  // For issues: the department/ward the supply went to
  @ForeignKey(() => Department)
  @Column({ type: DataType.UUID, allowNull: true })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @Column({ type: DataType.STRING(500), allowNull: true })
  reason?: string;

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
