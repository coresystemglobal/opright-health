import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  Index
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { Patient } from '@modules/patients/patient.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export interface VitalSignAttributes {
  id: string;
  patient_id: string;
  appointment_id?: string;
  temperature?: number;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  blood_glucose?: number;
  notes?: string;
  recorded_at: Date;
  recorded_by: string;
  tenant_id: string;
}

export interface VitalSignCreationAttributes extends Optional<VitalSignAttributes, 'id' | 'recorded_at' | 'bmi'> {}

@Table({
  tableName: 'vital_signs',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['patient_id']
    },
    {
      fields: ['appointment_id']
    },
    {
      fields: ['recorded_at']
    },
    {
      fields: ['recorded_by']
    }
  ]
})
export class VitalSign extends Model<VitalSignAttributes, VitalSignCreationAttributes> {
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

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  appointment_id?: string;

  @BelongsTo(() => Appointment)
  appointment?: Appointment;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Temperature in Fahrenheit'
  })
  temperature?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Heart rate in beats per minute'
  })
  heart_rate?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Systolic blood pressure in mmHg'
  })
  blood_pressure_systolic?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Diastolic blood pressure in mmHg'
  })
  blood_pressure_diastolic?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Respiratory rate per minute'
  })
  respiratory_rate?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Oxygen saturation percentage'
  })
  oxygen_saturation?: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Height in centimeters'
  })
  height?: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Weight in kilograms'
  })
  weight?: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Body Mass Index'
  })
  bmi?: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Blood glucose in mg/dL'
  })
  blood_glucose?: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  recorded_at!: Date;

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

  // Virtual fields and methods
  get blood_pressure(): string | null {
    if (!this.blood_pressure_systolic || !this.blood_pressure_diastolic) {
      return null;
    }
    return `${this.blood_pressure_systolic}/${this.blood_pressure_diastolic}`;
  }

  get calculated_bmi(): number | null {
    if (!this.height || !this.weight) return null;
    const heightMeters = this.height / 100;
    return parseFloat((this.weight / (heightMeters * heightMeters)).toFixed(2));
  }

  get bmi_category(): string | null {
    const bmiValue = this.bmi || this.calculated_bmi;
    if (!bmiValue) return null;

    if (bmiValue < 18.5) return 'Underweight';
    if (bmiValue < 25) return 'Normal';
    if (bmiValue < 30) return 'Overweight';
    return 'Obese';
  }

  // Alert flags for abnormal values
  get has_abnormal_values(): boolean {
    const abnormal: string[] = [];

    if (this.temperature && (this.temperature < 97.0 || this.temperature > 99.5)) {
      abnormal.push('temperature');
    }
    if (this.heart_rate && (this.heart_rate < 60 || this.heart_rate > 100)) {
      abnormal.push('heart_rate');
    }
    if (this.blood_pressure_systolic && (this.blood_pressure_systolic < 90 || this.blood_pressure_systolic > 140)) {
      abnormal.push('bp_systolic');
    }
    if (this.blood_pressure_diastolic && (this.blood_pressure_diastolic < 60 || this.blood_pressure_diastolic > 90)) {
      abnormal.push('bp_diastolic');
    }
    if (this.oxygen_saturation && this.oxygen_saturation < 95) {
      abnormal.push('oxygen');
    }
    if (this.respiratory_rate && (this.respiratory_rate < 12 || this.respiratory_rate > 20)) {
      abnormal.push('respiratory');
    }

    return abnormal.length > 0;
  }

  getAbnormalValues(): string[] {
    const abnormal: string[] = [];

    if (this.temperature && (this.temperature < 97.0 || this.temperature > 99.5)) {
      abnormal.push(`Temperature: ${this.temperature}°F`);
    }
    if (this.heart_rate && (this.heart_rate < 60 || this.heart_rate > 100)) {
      abnormal.push(`Heart Rate: ${this.heart_rate} bpm`);
    }
    if (this.blood_pressure_systolic && (this.blood_pressure_systolic < 90 || this.blood_pressure_systolic > 140)) {
      abnormal.push(`BP Systolic: ${this.blood_pressure_systolic} mmHg`);
    }
    if (this.blood_pressure_diastolic && (this.blood_pressure_diastolic < 60 || this.blood_pressure_diastolic > 90)) {
      abnormal.push(`BP Diastolic: ${this.blood_pressure_diastolic} mmHg`);
    }
    if (this.oxygen_saturation && this.oxygen_saturation < 95) {
      abnormal.push(`O2 Saturation: ${this.oxygen_saturation}%`);
    }
    if (this.respiratory_rate && (this.respiratory_rate < 12 || this.respiratory_rate > 20)) {
      abnormal.push(`Respiratory Rate: ${this.respiratory_rate}/min`);
    }

    return abnormal;
  }
}
