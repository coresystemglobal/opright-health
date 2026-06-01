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

import { Department } from '@modules/hospital/department.model';

import { Tenant } from '@modules/tenancy/tenant.model';
import { Priority } from '@modules/appointments/appointment.model';


export enum WaitlistStatus {
  WAITING = 'waiting',
  CONTACTED = 'contacted',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

@Table({
  tableName: 'appointment_waitlist',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['patient_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['department_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['created_at']
    }
  ]
})
export class AppointmentWaitlist extends Model {
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

  @ForeignKey(() => Doctor)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  doctor_id?: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @Column({
    type: DataType.ENUM(...Object.values(Priority)),
    allowNull: false,
    defaultValue: Priority.NORMAL
  })
  priority!: Priority;

  @Column({
    type: DataType.ENUM(...Object.values(WaitlistStatus)),
    allowNull: false,
    defaultValue: WaitlistStatus.WAITING
  })
  status!: WaitlistStatus;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  preferred_date_start?: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  preferred_date_end?: Date;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
    comment: 'Preferred time slots, e.g., ["morning", "afternoon"]'
  })
  preferred_time_slots?: string[];

  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    comment: 'Preferred days of week: 0=Sunday, 1=Monday, etc.'
  })
  preferred_days?: number[];

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  reason?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  contacted_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  scheduled_at?: Date;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Reference to appointment if scheduled'
  })
  appointment_id?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  expires_at?: Date;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  }

  get wait_time_days(): number {
    const createdDate = new Date(this.createdAt);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get is_high_priority(): boolean {
    return this.priority === Priority.HIGH || this.priority === Priority.URGENT;
  }

  // Instance methods
  async markAsContacted(): Promise<void> {
    this.status = WaitlistStatus.CONTACTED;
    this.contacted_at = new Date();
    await this.save();
  }

  async markAsScheduled(appointmentId: string): Promise<void> {
    this.status = WaitlistStatus.SCHEDULED;
    this.scheduled_at = new Date();
    this.appointment_id = appointmentId;
    await this.save();
  }

  async markAsExpired(): Promise<void> {
    this.status = WaitlistStatus.EXPIRED;
    await this.save();
  }

  async cancel(): Promise<void> {
    this.status = WaitlistStatus.CANCELLED;
    await this.save();
  }
}
