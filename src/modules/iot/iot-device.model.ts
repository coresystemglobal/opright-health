import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';

export enum DeviceType {
  VITAL_MONITOR = 'vital_monitor',
  GLUCOSE_METER = 'glucose_meter',
  BLOOD_PRESSURE_MONITOR = 'blood_pressure_monitor',
  THERMOMETER = 'thermometer',
  PULSE_OXIMETER = 'pulse_oximeter',
  ECG_MONITOR = 'ecg_monitor',
  WEIGHT_SCALE = 'weight_scale',
  WEARABLE = 'wearable',
  OTHER = 'other'
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DECOMMISSIONED = 'decommissioned'
}

/**
 * A registered IoT / medical device that streams readings into the platform.
 * `thresholds` holds per-metric alert bounds, e.g.
 *   { heart_rate: { min: 50, max: 120 }, oxygen_saturation: { min: 92 } }
 * A device may be assigned to a patient (wearables / home monitoring) or left
 * unassigned (a ward-mounted monitor that tags the patient per reading).
 */
@Table({
  tableName: 'iot_devices',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['status'] },
    { fields: ['assigned_patient_id'] },
    { fields: ['external_device_id', 'tenant_id'], unique: true }
  ]
})
export class IoTDevice extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  // Vendor / hardware identifier, unique within a tenant.
  @Column({ type: DataType.STRING(100), allowNull: false })
  external_device_id!: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name!: string;

  @Column({ type: DataType.ENUM(...Object.values(DeviceType)), allowNull: false, defaultValue: DeviceType.VITAL_MONITOR })
  device_type!: DeviceType;

  @Column({ type: DataType.STRING(200), allowNull: true })
  location?: string;

  @Column({ type: DataType.ENUM(...Object.values(DeviceStatus)), allowNull: false, defaultValue: DeviceStatus.ACTIVE })
  status!: DeviceStatus;

  // Per-metric alert bounds: { metric: { min?, max? } }
  @Column({ type: DataType.JSONB, allowNull: true })
  thresholds?: Record<string, { min?: number; max?: number }>;

  @Column({ type: DataType.DATE, allowNull: true, comment: 'Timestamp of the most recent reading' })
  last_seen_at?: Date;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: true })
  assigned_patient_id?: string;

  @BelongsTo(() => Patient)
  assigned_patient?: Patient;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
