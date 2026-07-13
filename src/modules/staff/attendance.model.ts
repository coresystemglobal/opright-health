import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { StaffProfile } from '@modules/staff/staff-profile.model';

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave'
}

/**
 * One attendance record per staff member per work day. clock_out and
 * hours_worked are filled in when the member clocks out; a single row is kept
 * unique per (staff_id, work_date) so a second clock-in updates rather than
 * duplicates.
 */
@Table({
  tableName: 'staff_attendance',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['staff_id'] },
    { fields: ['work_date'] },
    { fields: ['staff_id', 'work_date'], unique: true }
  ]
})
export class Attendance extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => StaffProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  staff_id!: string;

  @BelongsTo(() => StaffProfile)
  staff?: StaffProfile;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  work_date!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  clock_in?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  clock_out?: Date;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 0, comment: 'Hours worked, computed at clock-out' })
  hours_worked!: number;

  @Column({ type: DataType.ENUM(...Object.values(AttendanceStatus)), allowNull: false, defaultValue: AttendanceStatus.PRESENT })
  status!: AttendanceStatus;

  @Column({ type: DataType.STRING(500), allowNull: true })
  notes?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
