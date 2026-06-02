import { Table, Column, Model, DataType, BelongsToMany, HasMany } from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Permission } from '@modules/rbac/permission.model';

import { RolePermission } from '@modules/rbac/role-permission.model';


export enum RoleType {
  VISITOR = 'visitor',
  MANAGER = 'manager', 
  ADMIN = 'admin',
  SECURITY = 'security',
  SUPER_ADMIN = 'super_admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient'
}

@Table({
  tableName: 'roles',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class Role extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.ENUM(...Object.values(RoleType)),
    allowNull: false,
    unique: true
  })
  role!: RoleType;

  @Column({
    type: DataType.STRING(255),
    allowNull: true
  })
  description?: string;

  @HasMany(() => User, 'role_id')
  users?: User[];

  @BelongsToMany(() => Permission, () => RolePermission)
  permissions?: Permission[];

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;
}