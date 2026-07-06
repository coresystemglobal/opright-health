import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  HasMany,
  HasOne,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';
import { Role } from '@modules/rbac/role.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export enum UserRole {
  PATIENT = 'patient',
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  DOCTOR = 'doctor',
  VISITOR = 'visitor',
  NURSE = 'nurse',
  LABORATORY = 'laboratory',
  PHARMACY = 'pharmacy',
  ACCOUNTANT = 'accountant',
  RECEPTIONIST = 'receptionist',
  OTHER = 'other'
}

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  first_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  last_name!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    unique: true
  })
  username?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  role_id?: string;

  @BelongsTo(() => Role)
  role?: Role;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  tenant_id?: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;



  @Column({
    type: DataType.STRING
  })
  phone?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  verified!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  // Timestamp fields
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  failed_login_attempts?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  locked_until?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  last_login_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  password_changed_at?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  reset_token?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  reset_token_expires?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  totp_secret?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  totp_enabled!: boolean;

  @Column({
    type: DataType.JSON,
    allowNull: true
  })
  totp_backup_codes?: string[];

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;
}


