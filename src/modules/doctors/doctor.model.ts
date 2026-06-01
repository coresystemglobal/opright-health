import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  HasMany,
  BelongsTo,
  ForeignKey,
  Index
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Appointment } from '@modules/appointments/appointment.model';


export enum Specialization {
  GENERAL_MEDICINE = 'general_medicine',
  CARDIOLOGY = 'cardiology',
  DERMATOLOGY = 'dermatology',
  ENDOCRINOLOGY = 'endocrinology',
  GASTROENTEROLOGY = 'gastroenterology',
  HEMATOLOGY = 'hematology',
  INFECTIOUS_DISEASE = 'infectious_disease',
  NEPHROLOGY = 'nephrology',
  NEUROLOGY = 'neurology',
  ONCOLOGY = 'oncology',
  ORTHOPEDICS = 'orthopedics',
  PEDIATRICS = 'pediatrics',
  PSYCHIATRY = 'psychiatry',
  PULMONOLOGY = 'pulmonology',
  RADIOLOGY = 'radiology',
  SURGERY = 'surgery',
  UROLOGY = 'urology',
  GYNECOLOGY = 'gynecology',
  OPHTHALMOLOGY = 'ophthalmology',
  ENT = 'ent'
}

export enum Department {
  EMERGENCY = 'emergency',
  ICU = 'icu',
  OUTPATIENT = 'outpatient',
  SURGERY = 'surgery',
  PEDIATRICS = 'pediatrics',
  MATERNITY = 'maternity',
  CARDIOLOGY = 'cardiology',
  ONCOLOGY = 'oncology',
  RADIOLOGY = 'radiology',
  LABORATORY = 'laboratory'
}

@Table({
  tableName: 'doctors',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['license_number']
    },
    {
      fields: ['specialization']
    },
    {
      fields: ['department']
    },
    {
      fields: ['is_available']
    }
  ]
})
export class Doctor extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  user_id!: string;

  @BelongsTo(() => User)
  user?: User;

  @Column({
    type: DataType.ENUM(...Object.values(Specialization)),
    allowNull: false
  })
  specialization!: Specialization;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true
  })
  license_number!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  consultation_fee!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 60
    }
  })
  experience_years?: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  qualification?: string;

  @Column({
    type: DataType.ENUM(...Object.values(Department)),
    allowNull: true
  })
  department?: Department;

  // New: Department entity reference (for formal department management)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Reference to departments table for formal department management'
  })
  department_id?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_available!: boolean;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '09:00:00'
  })
  working_hours_start?: string;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '17:00:00'
  })
  working_hours_end?: string;

  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    defaultValue: [1, 2, 3, 4, 5], // Monday to Friday
    comment: 'Working days: 0=Sunday, 1=Monday, ..., 6=Saturday'
  })
  working_days?: number[];

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 30,
    validate: {
      min: 15,
      max: 120
    }
  })
  appointment_duration_minutes?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 20,
    validate: {
      min: 1,
      max: 100
    }
  })
  max_appointments_per_day?: number;

  @HasMany(() => Appointment)
  appointments?: Appointment[];

  // Virtual fields
  get full_name(): string {
    return this.user ? `Dr. ${this.user.first_name} ${this.user.last_name}` : '';
  }

  get experience_level(): string {
    if (!this.experience_years) return 'Entry Level';
    if (this.experience_years <= 2) return 'Junior';
    if (this.experience_years <= 5) return 'Mid-Level';
    if (this.experience_years <= 10) return 'Senior';
    return 'Expert';
  }

  // Instance methods
  isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return this.working_days ? this.working_days.includes(dayOfWeek) : false;
  }

  isWithinWorkingHours(time: string): boolean {
    if (!this.working_hours_start || !this.working_hours_end) return true;
    return time >= this.working_hours_start && time <= this.working_hours_end;
  }

  getAvailableTimeSlots(date: Date): string[] {
    if (!this.isWorkingDay(date) || !this.is_available) return [];
    
    const slots: string[] = [];
    const duration = this.appointment_duration_minutes || 30;
    const startHour = parseInt(this.working_hours_start?.split(':')[0] || '9');
    const endHour = parseInt(this.working_hours_end?.split(':')[0] || '17');

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        slots.push(timeSlot);
      }
    }

    return slots;
  }

  // Calculate consultation fee with potential discounts
  getConsultationFee(isFollowUp: boolean = false): number {
    const baseFee = parseFloat(this.consultation_fee.toString());
    if (isFollowUp) {
      return baseFee * 0.7; // 30% discount for follow-up appointments
    }
    return baseFee;
  }
}