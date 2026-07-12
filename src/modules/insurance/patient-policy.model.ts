import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';
import { InsuranceProvider } from '@modules/insurance/insurance-provider.model';

export enum PolicyRelationship {
  SELF = 'self',
  SPOUSE = 'spouse',
  CHILD = 'child',
  OTHER = 'other'
}

export enum PolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired'
}

@Table({
  tableName: 'patient_insurance_policies',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['patient_id'] },
    { fields: ['insurance_provider_id'] },
    { fields: ['status'] }
  ]
})
export class PatientInsurancePolicy extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: false })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => InsuranceProvider)
  @Column({ type: DataType.UUID, allowNull: false })
  insurance_provider_id!: string;

  @BelongsTo(() => InsuranceProvider)
  provider?: InsuranceProvider;

  @Column({ type: DataType.STRING(60), allowNull: false })
  policy_number!: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  plan_name?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 100 },
    comment: 'Percentage of cost the insurer covers (0-100)'
  })
  coverage_percentage!: number;

  @Column({ type: DataType.STRING(150), allowNull: true })
  holder_name?: string;

  @Column({ type: DataType.ENUM(...Object.values(PolicyRelationship)), allowNull: false, defaultValue: PolicyRelationship.SELF })
  relationship!: PolicyRelationship;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  valid_from?: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  valid_to?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_primary!: boolean;

  @Column({ type: DataType.ENUM(...Object.values(PolicyStatus)), allowNull: false, defaultValue: PolicyStatus.ACTIVE })
  status!: PolicyStatus;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  /** Active status and within the validity window (if dates are set). */
  get is_valid(): boolean {
    if (this.status !== PolicyStatus.ACTIVE) return false;
    const today = new Date().toISOString().split('T')[0];
    if (this.valid_from && today < this.valid_from) return false;
    if (this.valid_to && today > this.valid_to) return false;
    return true;
  }
}
