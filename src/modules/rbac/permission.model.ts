import { Table, Column, Model, DataType, BelongsToMany } from 'sequelize-typescript';
import { Role } from '@modules/rbac/role.model';

import { RolePermission } from '@modules/rbac/role-permission.model';


@Table({
  tableName: 'permissions',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class Permission extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true
  })
  name!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false
  })
  resource!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false
  })
  action!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true
  })
  description?: string;

  @BelongsToMany(() => Role, () => RolePermission)
  roles?: Role[];

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;
}