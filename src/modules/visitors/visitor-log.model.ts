import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  Index
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';

export enum VisitorStatus {
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out'
}

export enum VisitorIdType {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  OTHER = 'other'
}

export enum VisitPurpose {
  PATIENT_VISIT = 'patient_visit',
  DELIVERY = 'delivery',
  OFFICIAL = 'official',
  OTHER = 'other'
}

@Table({
  tableName: 'visitor_logs',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['visitor_phone'] },
    { fields: ['status'] },
    { fields: ['entry_time'] }
  ]
})
export class VisitorLog extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant!: Tenant;

  @Column({ type: DataType.STRING(100), allowNull: false })
  visitor_name!: string;

  @Index
  @Column({ type: DataType.STRING(20), allowNull: false })
  visitor_phone!: string;

  @Column({ type: DataType.ENUM(...Object.values(VisitorIdType)), allowNull: true })
  id_type!: VisitorIdType | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  id_number!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: false })
  host_name!: string;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: true })
  patient_id!: string | null;

  @BelongsTo(() => Patient)
  patient!: Patient | null;

  @Column({ type: DataType.ENUM(...Object.values(VisitPurpose)), allowNull: false, defaultValue: VisitPurpose.PATIENT_VISIT })
  purpose!: VisitPurpose;

  @Column({ type: DataType.STRING(100), allowNull: true })
  ward_or_location!: string | null;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  entry_time!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  exit_time!: Date | null;

  @Column({ type: DataType.ENUM(...Object.values(VisitorStatus)), allowNull: false, defaultValue: VisitorStatus.CHECKED_IN })
  status!: VisitorStatus;

  @Column({ type: DataType.STRING(20), allowNull: true })
  badge_number!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
