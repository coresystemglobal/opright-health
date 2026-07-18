import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Person } from '@modules/mpi/person.model';
import { ConsentSignature } from '@modules/compliance/consent-signature.model';

/**
 * A patient's authorization for one hospital (source_tenant) to release a
 * category of their records to another hospital (recipient_tenant). This is
 * the ONLY sanctioned cross-tenant data path: the read endpoint checks for an
 * active, unexpired grant before returning any source-tenant records.
 *
 * Person-scoped and directional (source → recipient). Kept separate from
 * ConsentRecord, which is tenant-scoped, append-only, and has no recipient.
 */
export enum ShareScope {
  DEMOGRAPHICS = 'demographics',
  ALLERGIES = 'allergies',
  MEDICATIONS = 'medications',
  LAB_RESULTS = 'lab_results',
  CLINICAL_NOTES = 'clinical_notes',
  FULL_RECORD = 'full_record'
}

export enum ShareStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

@Table({
  tableName: 'patient_record_shares',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['person_id'] },
    { fields: ['recipient_tenant_id', 'status'] },
    { fields: ['source_tenant_id'] },
    { fields: ['expires_at'] }
  ]
})
export class PatientRecordShare extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: false })
  person_id!: string;

  @BelongsTo(() => Person)
  person?: Person;

  // Tenant that holds the records and is authorized to release them.
  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  source_tenant_id!: string;

  @BelongsTo(() => Tenant, 'source_tenant_id')
  source_tenant?: Tenant;

  // Tenant permitted to read the released records.
  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  recipient_tenant_id!: string;

  @BelongsTo(() => Tenant, 'recipient_tenant_id')
  recipient_tenant?: Tenant;

  @Column({ type: DataType.ENUM(...Object.values(ShareScope)), allowNull: false })
  scope!: ShareScope;

  @Column({ type: DataType.ENUM(...Object.values(ShareStatus)), allowNull: false, defaultValue: ShareStatus.ACTIVE })
  status!: ShareStatus;

  @Column({ type: DataType.DATE, allowNull: true })
  granted_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true, comment: 'When the grant expires; null = no expiry' })
  expires_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  revoked_at?: Date;

  // Optional captured signature attesting the authorization (reuses the
  // compliance digital-signature/tamper-evidence pattern).
  @ForeignKey(() => ConsentSignature)
  @Column({ type: DataType.UUID, allowNull: true })
  consent_signature_id?: string;

  @BelongsTo(() => ConsentSignature)
  consent_signature?: ConsentSignature;

  declare createdAt: Date;
  declare updatedAt: Date;

  /** True when the grant currently permits reads. */
  get is_effective(): boolean {
    if (this.status !== ShareStatus.ACTIVE) return false;
    if (this.expires_at && new Date(this.expires_at) <= new Date()) return false;
    return true;
  }
}
