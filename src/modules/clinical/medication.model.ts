import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  Index
} from 'sequelize-typescript';
import { Patient } from '@modules/patients/patient.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export enum MedicationRoute {
  ORAL = 'oral',
  INTRAVENOUS = 'intravenous',
  INTRAMUSCULAR = 'intramuscular',
  SUBCUTANEOUS = 'subcutaneous',
  TOPICAL = 'topical',
  INHALATION = 'inhalation',
  RECTAL = 'rectal',
  SUBLINGUAL = 'sublingual',
  TRANSDERMAL = 'transdermal',
  OTHER = 'other'
}

export enum MedicationFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  EVERY_4_HOURS = 'every_4_hours',
  EVERY_6_HOURS = 'every_6_hours',
  EVERY_8_HOURS = 'every_8_hours',
  EVERY_12_HOURS = 'every_12_hours',
  AS_NEEDED = 'as_needed',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  OTHER = 'other'
}

@Table({
  tableName: 'medications',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['patient_id']
    },
    {
      fields: ['prescribing_doctor_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['start_date']
    }
  ]
})
export class Medication extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Patient)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  medication_name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  dosage!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  strength?: string;

  @Column({
    type: DataType.ENUM(...Object.values(MedicationRoute)),
    allowNull: false,
    defaultValue: MedicationRoute.ORAL
  })
  route!: MedicationRoute;

  @Column({
    type: DataType.ENUM(...Object.values(MedicationFrequency)),
    allowNull: false
  })
  frequency!: MedicationFrequency;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  instructions?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  start_date!: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  end_date?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  reason?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  side_effects?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @ForeignKey(() => Doctor)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  prescribing_doctor_id!: string;

  @BelongsTo(() => Doctor)
  prescribing_doctor?: Doctor;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  recorded_by!: string;

  @BelongsTo(() => User, 'recorded_by')
  recorder?: User;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get is_current(): boolean {
    if (!this.is_active) return false;
    if (!this.end_date) return true;
    return new Date() <= new Date(this.end_date);
  }

  get duration_days(): number | null {
    if (!this.end_date) return null;
    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get display_dosage(): string {
    return this.strength 
      ? `${this.medication_name} ${this.strength} - ${this.dosage}`
      : `${this.medication_name} - ${this.dosage}`;
  }
}
