import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Role } from '@modules/rbac/role.model';

import { Permission } from '@modules/rbac/permission.model';


@Table({
  tableName: 'role_permissions',
  timestamps: true,
  underscored: true
})
export class RolePermission extends Model {
  @ForeignKey(() => Role)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  role_id!: string;

  @ForeignKey(() => Permission)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  permission_id!: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}