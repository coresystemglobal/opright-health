import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { AccreditationStatus } from '@modules/hospital/hospital.model';

export enum LaboratoryType {
  CLINICAL = 'clinical',
  PATHOLOGY = 'pathology',
  MOLECULAR = 'molecular',
  MICROBIOLOGY = 'microbiology',
  RADIOLOGY = 'radiology',
  REFERENCE = 'reference',
  OTHER = 'other'
}

/**
 * Facility profile for a standalone (or hospital-affiliated) laboratory tenant.
 * Parallels the Hospital profile, but is linked to its Tenant via tenant_id.
 */
@Table({
  tableName: 'laboratories',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { unique: true, fields: ['license_number'] },
    { fields: ['lab_type'] },
    { fields: ['is_active'] }
  ]
})
export class Laboratory extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({ type: DataType.STRING(200), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  short_name?: string;

  @Index({ unique: true })
  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  license_number!: string;

  @Column({ type: DataType.ENUM(...Object.values(LaboratoryType)), allowNull: false, defaultValue: LaboratoryType.CLINICAL })
  lab_type!: LaboratoryType;

  @Column({ type: DataType.ENUM(...Object.values(AccreditationStatus)), allowNull: false, defaultValue: AccreditationStatus.NOT_ACCREDITED })
  accreditation_status!: AccreditationStatus;

  @Column({ type: DataType.STRING(100), allowNull: true })
  accrediting_body?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  accreditation_expiry?: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  address?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  city?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  state?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  country?: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  phone?: string;

  @Column({ type: DataType.STRING(255), allowNull: true, validate: { isEmail: true } })
  email?: string;

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  test_categories_offered?: string[];

  @Column({ type: DataType.JSONB, allowNull: true })
  operating_hours?: Record<string, unknown>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  established_date?: Date;

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_accredited(): boolean {
    return this.accreditation_status === AccreditationStatus.ACCREDITED;
  }
}
