import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Patient } from '@modules/patients/patient.model';
import { IoTDevice } from '@modules/iot/iot-device.model';

/**
 * A single reading ingested from an IoT device. `metrics` is a flexible map of
 * measurement → value (heart_rate, oxygen_saturation, glucose_level, …).
 * `alerts` lists any threshold breaches computed at ingest time; `is_abnormal`
 * is the quick-filter flag derived from it.
 */
@Table({
  tableName: 'iot_device_readings',
  timestamps: true,
  underscored: true,
  paranoid: false,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['device_id'] },
    { fields: ['patient_id'] },
    { fields: ['recorded_at'] },
    { fields: ['is_abnormal'] }
  ]
})
export class DeviceReading extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => IoTDevice)
  @Column({ type: DataType.UUID, allowNull: false })
  device_id!: string;

  @BelongsTo(() => IoTDevice)
  device?: IoTDevice;

  @ForeignKey(() => Patient)
  @Column({ type: DataType.UUID, allowNull: true })
  patient_id?: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @Column({ type: DataType.JSONB, allowNull: false })
  metrics!: Record<string, any>;

  @Column({ type: DataType.JSONB, allowNull: true })
  alerts?: string[];

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_abnormal!: boolean;

  @Column({ type: DataType.DATE, allowNull: false })
  recorded_at!: Date;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
