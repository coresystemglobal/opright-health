import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';
import { User } from '@modules/users/user.model';
import { Invoice } from '@modules/billing/invoice.model';
import { InsuranceProvider } from '@modules/insurance/insurance-provider.model';
import { PatientInsurancePolicy } from '@modules/insurance/patient-policy.model';

export enum ClaimType {
  CLAIM = 'claim',
  PREAUTHORIZATION = 'preauthorization'
}

export enum ClaimStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  PARTIALLY_APPROVED = 'partially_approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

@Table({
  tableName: 'insurance_claims',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['patient_id'] },
    { fields: ['insurance_provider_id'] },
    { fields: ['policy_id'] },
    { fields: ['invoice_id'] },
    { fields: ['status'] },
    { fields: ['claim_number'], unique: true }
  ]
})
export class InsuranceClaim extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(30), allowNull: false, unique: true })
  claim_number!: string;

  @Column({ type: DataType.ENUM(...Object.values(ClaimType)), allowNull: false, defaultValue: ClaimType.CLAIM })
  claim_type!: ClaimType;

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

  @ForeignKey(() => PatientInsurancePolicy)
  @Column({ type: DataType.UUID, allowNull: true })
  policy_id?: string;

  @BelongsTo(() => PatientInsurancePolicy)
  policy?: PatientInsurancePolicy;

  @ForeignKey(() => Invoice)
  @Column({ type: DataType.UUID, allowNull: true })
  invoice_id?: string;

  @BelongsTo(() => Invoice)
  invoice?: Invoice;

  @Column({ type: DataType.ENUM(...Object.values(ClaimStatus)), allowNull: false, defaultValue: ClaimStatus.DRAFT })
  status!: ClaimStatus;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  service_date?: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  claimed_amount!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  approved_amount?: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, comment: "Patient's out-of-pocket portion" })
  copay_amount?: number;

  @Column({ type: DataType.STRING(80), allowNull: true, comment: 'Authorization code (pre-auth approvals)' })
  authorization_code?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  diagnosis?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejection_reason?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  submitted_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  decided_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  paid_at?: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  created_by!: string;

  @BelongsTo(() => User, 'created_by')
  creator?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_open(): boolean {
    return ![ClaimStatus.PAID, ClaimStatus.REJECTED, ClaimStatus.CANCELLED].includes(this.status);
  }
}
