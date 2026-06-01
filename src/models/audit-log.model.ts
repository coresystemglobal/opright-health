import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Tenant } from './tenant.model';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS = 'access',
  EXPORT = 'export'
}

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true
})
export class AuditLog extends Model {
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

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  user_id?: string;

  @BelongsTo(() => User)
  user?: User;

  @Column({
    type: DataType.ENUM(...Object.values(AuditAction)),
    allowNull: false
  })
  action!: AuditAction;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  resource!: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  resource_id?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  old_values?: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  new_values?: any;

  @Column({
    type: DataType.STRING(45),
    allowNull: true
  })
  ip_address?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true
  })
  user_agent?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}