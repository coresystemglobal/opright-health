import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Patient } from '@modules/patients/patient.model';


export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Table({
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class Tenant extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true
  })
  subdomain!: string;

  @Column({
    type: DataType.ENUM(...Object.values(TenantStatus)),
    allowNull: false,
    defaultValue: TenantStatus.ACTIVE
  })
  status!: TenantStatus;

  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  contact_email!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false
  })
  contact_phone!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  address?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  stripe_customer_id?: string;

  @HasMany(() => User)
  users?: User[];

  @HasMany(() => Patient)
  patients?: Patient[];

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;
}