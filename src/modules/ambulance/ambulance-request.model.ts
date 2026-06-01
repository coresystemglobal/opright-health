import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Ambulance } from '@modules/ambulance/ambulance.model';

import { Patient } from '@modules/patients/patient.model';


export enum RequestStatus {
  PENDING = 'pending',
  DISPATCHED = 'dispatched',
  ARRIVED = 'arrived',
  TRANSPORTING = 'transporting',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum EmergencyLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

@Table({
  tableName: 'ambulance_requests',
  timestamps: true,
  underscored: true
})
export class AmbulanceRequest extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Patient)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  patient_id?: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => Ambulance)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  ambulance_id?: string;

  @BelongsTo(() => Ambulance)
  ambulance?: Ambulance;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  pickup_location!: string;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: false
  })
  pickup_latitude!: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: false
  })
  pickup_longitude!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  emergency_details!: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmergencyLevel)),
    defaultValue: EmergencyLevel.MEDIUM,
    allowNull: false
  })
  emergency_level!: EmergencyLevel;

  @Column({
    type: DataType.ENUM(...Object.values(RequestStatus)),
    defaultValue: RequestStatus.PENDING,
    allowNull: false
  })
  status!: RequestStatus;

  @Column({
    type: DataType.STRING(20),
    allowNull: false
  })
  caller_phone!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  dispatched_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  arrived_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  completed_at?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  eta_minutes?: number;
}
