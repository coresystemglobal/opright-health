import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  HasOne,
  Index,
  BeforeCreate,
  BeforeUpdate
} from 'sequelize-typescript';
import { Patient } from '@modules/patients/patient.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { User } from '@modules/users/user.model';

import { Invoice } from '@modules/billing/invoice.model';


export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export enum AppointmentType {
  NEW_PATIENT = 'new_patient',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  ROUTINE_CHECKUP = 'routine_checkup',
  CONSULTATION = 'consultation',
  PROCEDURE = 'procedure',
  LAB_TEST = 'lab_test',
  PATHOLOGY = 'pathology',
  RADIOLOGY_IMAGING = 'radiology_imaging',
  BLOOD_WORK = 'blood_work',
  SPECIMEN_COLLECTION = 'specimen_collection'
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

@Table({
  tableName: 'appointments',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['doctor_id', 'appointment_date', 'appointment_time'],
      where: {
        deleted_at: null,
        status: ['scheduled', 'confirmed', 'in_progress']
      }
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['appointment_date']
    },
    {
      fields: ['status']
    },
    {
      fields: ['appointment_type']
    }
  ]
})
export class Appointment extends Model {
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
    allowNull: false
  })
  doctor_id!: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  appointment_date!: Date;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  appointment_time!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 15,
      max: 120
    }
  })
  duration_minutes!: number;

  @Column({
    type: DataType.ENUM(...Object.values(AppointmentStatus)),
    allowNull: false,
    defaultValue: AppointmentStatus.SCHEDULED
  })
  status!: AppointmentStatus;

  @Column({
    type: DataType.ENUM(...Object.values(AppointmentType)),
    allowNull: false,
    defaultValue: AppointmentType.CONSULTATION
  })
  appointment_type!: AppointmentType;

  @Column({
    type: DataType.ENUM(...Object.values(Priority)),
    allowNull: false,
    defaultValue: Priority.NORMAL
  })
  priority!: Priority;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  chief_complaint?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  diagnosis?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  treatment_plan?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  prescription?: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  created_by!: string;

  @BelongsTo(() => User, 'created_by')
  creator?: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  cancelled_by?: string;

  @BelongsTo(() => User, 'cancelled_by')
  canceller?: User;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  cancellation_reason?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  cancelled_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  checked_in_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  started_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  completed_at?: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  consultation_fee?: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_follow_up!: boolean;

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  parent_appointment_id?: string;

  @BelongsTo(() => Appointment, 'parent_appointment_id')
  parent_appointment?: Appointment;

  @HasOne(() => Invoice)
  invoice?: Invoice;

  // ICD-10 Diagnosis Codes
  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Array of ICD-10 diagnosis codes'
  })
  icd10_codes?: string[];

  // Recurring Appointment Support
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_recurring!: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Recurrence pattern: {frequency: "daily"|"weekly"|"monthly", interval: number, endDate?: Date, daysOfWeek?: number[]}'
  })
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Parent recurring appointment ID for series instances'
  })
  parent_recurring_id?: string;

  @BelongsTo(() => Appointment, 'parent_recurring_id')
  parent_recurring_appointment?: Appointment;

  // Resource Booking
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Resource ID if room/equipment is booked'
  })
  resource_id?: string;

  // Reminder tracking — set once the corresponding SMS reminder is sent,
  // so the reminder cron is idempotent and never double-texts a patient.
  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  reminder_24h_sent_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  reminder_2h_sent_at?: Date;

  // Virtual fields
  get appointment_datetime(): Date {
    const dateStr = this.appointment_date.toISOString().split('T')[0];
    return new Date(`${dateStr}T${this.appointment_time}`);
  }

  get end_time(): string {
    const [hours, minutes] = this.appointment_time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + this.duration_minutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
  }

  get is_past(): boolean {
    return this.appointment_datetime < new Date();
  }

  get is_today(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const appointmentDate = this.appointment_date.toISOString().split('T')[0];
    return today === appointmentDate;
  }

  get can_be_cancelled(): boolean {
    if (this.status === AppointmentStatus.CANCELLED || 
        this.status === AppointmentStatus.COMPLETED ||
        this.status === AppointmentStatus.NO_SHOW) {
      return false;
    }
    
    // Can't cancel if appointment is in less than 2 hours
    const now = new Date();
    const appointmentTime = this.appointment_datetime;
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 2;
  }

  get can_be_rescheduled(): boolean {
    return this.can_be_cancelled && this.status === AppointmentStatus.SCHEDULED;
  }

  // Instance methods
  isConflictWith(otherAppointment: Appointment): boolean {
    if (this.doctor_id !== otherAppointment.doctor_id) return false;
    if (this.appointment_date.toISOString() !== otherAppointment.appointment_date.toISOString()) return false;
    
    const thisStart = this.appointment_time;
    const thisEnd = this.end_time;
    const otherStart = otherAppointment.appointment_time;
    const otherEnd = otherAppointment.end_time;
    
    return (thisStart < otherEnd && thisEnd > otherStart);
  }

  async cancel(cancelledBy: string, reason?: string): Promise<void> {
    if (!this.can_be_cancelled) {
      throw new Error('Appointment cannot be cancelled');
    }
    
    this.status = AppointmentStatus.CANCELLED;
    this.cancelled_by = cancelledBy;
    this.cancellation_reason = reason;
    this.cancelled_at = new Date();
    
    await this.save();
  }

  async checkIn(): Promise<void> {
    if (this.status !== AppointmentStatus.SCHEDULED && this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error('Appointment must be scheduled or confirmed to check in');
    }
    
    this.checked_in_at = new Date();
    this.status = AppointmentStatus.CONFIRMED;
    
    await this.save();
  }

  async start(): Promise<void> {
    if (this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error('Appointment must be confirmed to start');
    }
    
    this.started_at = new Date();
    this.status = AppointmentStatus.IN_PROGRESS;
    
    await this.save();
  }

  async complete(diagnosis?: string, treatmentPlan?: string, prescription?: string): Promise<void> {
    if (this.status !== AppointmentStatus.IN_PROGRESS) {
      throw new Error('Appointment must be in progress to complete');
    }
    
    this.completed_at = new Date();
    this.status = AppointmentStatus.COMPLETED;
    this.diagnosis = diagnosis;
    this.treatment_plan = treatmentPlan;
    this.prescription = prescription;
    
    await this.save();
  }

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async validateAppointmentTime(instance: Appointment) {
    // Validate appointment is not in the past
    const appointmentDateTime = new Date(`${instance.appointment_date}T${instance.appointment_time}`);
    if (appointmentDateTime < new Date()) {
      throw new Error('Appointment cannot be scheduled in the past');
    }

    // Validate appointment is during working hours
    if (instance.doctor && !instance.doctor.isWithinWorkingHours(instance.appointment_time)) {
      throw new Error('Appointment must be within doctor working hours');
    }
  }
}