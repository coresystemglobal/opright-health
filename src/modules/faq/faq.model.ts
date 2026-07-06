import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';

@Table({
  tableName: 'faqs',
  timestamps: true,
  underscored: true
})
export class FAQ extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  tenant_id?: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({
    type: DataType.STRING(500),
    allowNull: false
  })
  question!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  answer!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: 'general'
  })
  category!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  sort_order!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  is_active!: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}