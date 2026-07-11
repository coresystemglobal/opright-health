import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany
} from 'sequelize-typescript';
import { Hospital } from '@modules/hospital/hospital.model';
import { Department } from '@modules/hospital/department.model';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Bed } from '@modules/wards/bed.model';

export enum WardType {
  GENERAL = 'general',
  ICU = 'icu',
  MATERNITY = 'maternity',
  PEDIATRIC = 'pediatric',
  SURGICAL = 'surgical',
  ISOLATION = 'isolation',
  EMERGENCY = 'emergency',
  PSYCHIATRIC = 'psychiatric',
  OTHER = 'other'
}

export enum WardGenderRestriction {
  MALE = 'male',
  FEMALE = 'female',
  MIXED = 'mixed'
}

@Table({
  tableName: 'wards',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['hospital_id'] },
    { fields: ['department_id'] },
    { fields: ['code', 'tenant_id'], unique: true }
  ]
})
export class Ward extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Hospital)
  @Column({ type: DataType.UUID, allowNull: false })
  hospital_id!: string;

  @BelongsTo(() => Hospital)
  hospital?: Hospital;

  @ForeignKey(() => Department)
  @Column({ type: DataType.UUID, allowNull: true })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  code!: string;

  @Column({ type: DataType.ENUM(...Object.values(WardType)), allowNull: false, defaultValue: WardType.GENERAL })
  ward_type!: WardType;

  @Column({ type: DataType.ENUM(...Object.values(WardGenderRestriction)), allowNull: false, defaultValue: WardGenderRestriction.MIXED })
  gender_restriction!: WardGenderRestriction;

  @Column({ type: DataType.STRING(50), allowNull: true })
  floor?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @HasMany(() => Bed)
  beds?: Bed[];

  declare createdAt: Date;
  declare updatedAt: Date;
}
