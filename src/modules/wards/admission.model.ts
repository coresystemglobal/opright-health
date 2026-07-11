import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Patient } from '@modules/patients/patient.model';
import { Doctor } from '@modules/doctors/doctor.model';
import { User } from '@modules/users/user.model';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Ward } from '@modules/wards/ward.model';
import { Bed } from '@modules/wards/bed.model';

export enum AdmissionStatus {
  ADMITTED = 'admitted',
  DISCHARGED = 'discharged',
  TRANSFERRED = 'transferred'
}

@Table({
  tableName: 'admissions',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['patient_id'] },
    { fields: ['ward_id'] },
    { fields: ['bed_id'] },
    { fields: ['status'] },
    { fields: ['admission_number'], unique: true }
  ]
})
export class Admission extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(30), allowNull: false, unique: true })
  admission_number!: string;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: false })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => Ward)
  @Column({ type: DataType.UUID, allowNull: false })
  ward_id!: string;

  @BelongsTo(() => Ward)
  ward?: Ward;

  // Null once discharged (the bed is freed)
  @ForeignKey(() => Bed)
  @Column({ type: DataType.UUID, allowNull: true })
  bed_id?: string;

  @BelongsTo(() => Bed)
  bed?: Bed;

  @ForeignKey(() => Doctor)
  @Column({ type: DataType.UUID, allowNull: true })
  admitting_doctor_id?: string;

  @BelongsTo(() => Doctor)
  admitting_doctor?: Doctor;

  @Column({ type: DataType.ENUM(...Object.values(AdmissionStatus)), allowNull: false, defaultValue: AdmissionStatus.ADMITTED })
  status!: AdmissionStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  admitted_at!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  expected_discharge_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  discharged_at?: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  discharge_notes?: string;

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

  get is_active(): boolean {
    return this.status === AdmissionStatus.ADMITTED;
  }
}
