import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Role } from './role.model';
import { Permission } from './permission.model';

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