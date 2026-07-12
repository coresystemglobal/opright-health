import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';

export enum ConsentType {
  DATA_PROCESSING = 'data_processing',
  MARKETING = 'marketing',
  RESEARCH = 'research',
  DATA_SHARING = 'data_sharing',
  SMS = 'sms',
  EMAIL = 'email'
}

/**
 * A patient's consent decision for a processing purpose. The latest row per
 * (patient, consent_type) is authoritative; withdrawing sets `granted=false`
 * and stamps `withdrawn_at`.
 */
@Table({
  tableName: 'consent_records',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['patient_id'] },
    { fields: ['consent_type'] }
  ]
})
export class ConsentRecord extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: false })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @Column({ type: DataType.ENUM(...Object.values(ConsentType)), allowNull: false })
  consent_type!: ConsentType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  granted!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  granted_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  withdrawn_at?: Date;

  @Column({ type: DataType.STRING(30), allowNull: true, comment: 'Consent document/version reference' })
  consent_version?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
