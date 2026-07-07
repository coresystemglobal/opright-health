import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany
} from 'sequelize-typescript';
import { Patient } from '@modules/patients/patient.model';
import { Doctor } from '@modules/doctors/doctor.model';
import { Appointment } from '@modules/appointments/appointment.model';
import { User } from '@modules/users/user.model';
import { Tenant } from '@modules/tenancy/tenant.model';
import { PrescriptionItem } from '@modules/clinical/prescription-item.model';

export enum PrescriptionStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  SENT_TO_PHARMACY = 'sent_to_pharmacy',
  PARTIALLY_DISPENSED = 'partially_dispensed',
  DISPENSED = 'dispensed',
  CANCELLED = 'cancelled'
}

@Table({
  tableName: 'prescriptions',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['doctor_id'] },
    { fields: ['appointment_id'] },
    { fields: ['status'] },
    { fields: ['prescription_number'], unique: true }
  ]
})
export class Prescription extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    unique: true
  })
  prescription_number!: string;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: false })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => Doctor)
  @Column({ type: DataType.UUID, allowNull: false })
  doctor_id!: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @ForeignKey(() => Appointment)
  @Column({ type: DataType.UUID, allowNull: true })
  appointment_id?: string;

  @BelongsTo(() => Appointment)
  appointment?: Appointment;

  @Column({
    type: DataType.ENUM(...Object.values(PrescriptionStatus)),
    allowNull: false,
    defaultValue: PrescriptionStatus.ISSUED
  })
  status!: PrescriptionStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  diagnosis?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  issued_at?: Date;

  @Column({ type: DataType.STRING(200), allowNull: true })
  pharmacy_name?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  sent_to_pharmacy_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  dispensed_at?: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  dispensed_by?: string;

  @BelongsTo(() => User, 'dispensed_by')
  dispenser?: User;

  @Column({ type: DataType.TEXT, allowNull: true })
  cancellation_reason?: string;

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

  @HasMany(() => PrescriptionItem)
  items?: PrescriptionItem[];

  declare createdAt: Date;
  declare updatedAt: Date;

  get is_active(): boolean {
    return this.status !== PrescriptionStatus.CANCELLED && this.status !== PrescriptionStatus.DISPENSED;
  }
}
