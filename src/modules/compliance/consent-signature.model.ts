import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { ConsentRecord } from '@modules/compliance/consent.model';

export enum SignerRole {
  PATIENT = 'patient',
  GUARDIAN = 'guardian',
  WITNESS = 'witness',
  STAFF = 'staff'
}

export enum SignatureType {
  DRAWN = 'drawn',       // canvas image (base64 data URI)
  TYPED = 'typed',       // typed full name
  UPLOADED = 'uploaded'  // uploaded image
}

/**
 * A captured signature against a consent record. `document_hash` is a
 * SHA-256 of the consent's salient fields at signing time, so any later
 * change to the consent can be detected (tamper-evidence).
 */
@Table({
  tableName: 'consent_signatures',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['consent_record_id'] }
  ]
})
export class ConsentSignature extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => ConsentRecord)
  @Column({ type: DataType.UUID, allowNull: false })
  consent_record_id!: string;

  @BelongsTo(() => ConsentRecord)
  consent?: ConsentRecord;

  @Column({ type: DataType.ENUM(...Object.values(SignerRole)), allowNull: false, defaultValue: SignerRole.PATIENT })
  signer_role!: SignerRole;

  @Column({ type: DataType.STRING(150), allowNull: false })
  signer_name!: string;

  @Column({ type: DataType.ENUM(...Object.values(SignatureType)), allowNull: false })
  signature_type!: SignatureType;

  // base64 data URI (drawn/uploaded) or the typed name text
  @Column({ type: DataType.TEXT, allowNull: false })
  signature_data!: string;

  @Column({ type: DataType.STRING(64), allowNull: false, comment: 'SHA-256 of the signed consent content' })
  document_hash!: string;

  @Column({ type: DataType.STRING(60), allowNull: true })
  ip_address?: string;

  @Column({ type: DataType.STRING(400), allowNull: true })
  user_agent?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  signed_at!: Date;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
