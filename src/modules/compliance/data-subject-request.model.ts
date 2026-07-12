import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';
import { User } from '@modules/users/user.model';

export enum DataRequestType {
  ACCESS = 'access',        // right to access / data export
  ERASURE = 'erasure',      // right to erasure (anonymization)
  RECTIFICATION = 'rectification' // correction of inaccurate data
}

export enum DataRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

/**
 * An NDPR/GDPR data-subject request and its handling trail. Erasure requests,
 * when completed, trigger anonymization of the patient's direct identifiers.
 */
@Table({
  tableName: 'data_subject_requests',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['patient_id'] },
    { fields: ['request_type'] },
    { fields: ['status'] }
  ]
})
export class DataSubjectRequest extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: false })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @Column({ type: DataType.ENUM(...Object.values(DataRequestType)), allowNull: false })
  request_type!: DataRequestType;

  @Column({ type: DataType.ENUM(...Object.values(DataRequestStatus)), allowNull: false, defaultValue: DataRequestStatus.PENDING })
  status!: DataRequestStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  result_notes?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  requested_at!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completed_at?: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  handled_by?: string;

  @BelongsTo(() => User, 'handled_by')
  handler?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
