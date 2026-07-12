import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { PatientInsurancePolicy } from '@modules/insurance/patient-policy.model';

export enum ProviderType {
  HMO = 'hmo',
  PRIVATE_INSURER = 'private_insurer',
  GOVERNMENT = 'government',
  CORPORATE = 'corporate',
  OTHER = 'other'
}

@Table({
  tableName: 'insurance_providers',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['code', 'tenant_id'], unique: true }
  ]
})
export class InsuranceProvider extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  code!: string;

  @Column({ type: DataType.ENUM(...Object.values(ProviderType)), allowNull: false, defaultValue: ProviderType.HMO })
  provider_type!: ProviderType;

  @Column({ type: DataType.STRING(255), allowNull: true })
  contact_email?: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  contact_phone?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  address?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @HasMany(() => PatientInsurancePolicy)
  policies?: PatientInsurancePolicy[];

  declare createdAt: Date;
  declare updatedAt: Date;
}
