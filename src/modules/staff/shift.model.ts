import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';
import { Department } from '@modules/hospital/department.model';
import { StaffProfile } from '@modules/staff/staff-profile.model';

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
  ON_CALL = 'on_call'
}

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MISSED = 'missed'
}

/**
 * A scheduled work shift for a member of staff. Doubles as the on-call roster
 * when shift_type = on_call (is_on_call is kept in sync for quick filtering).
 */
@Table({
  tableName: 'staff_shifts',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['staff_id'] },
    { fields: ['department_id'] },
    { fields: ['starts_at'] },
    { fields: ['is_on_call'] }
  ]
})
export class Shift extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => StaffProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  staff_id!: string;

  @BelongsTo(() => StaffProfile)
  staff?: StaffProfile;

  @Column({ type: DataType.ENUM(...Object.values(ShiftType)), allowNull: false, defaultValue: ShiftType.MORNING })
  shift_type!: ShiftType;

  @Column({ type: DataType.DATE, allowNull: false })
  starts_at!: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  ends_at!: Date;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, comment: 'True for on-call roster entries' })
  is_on_call!: boolean;

  @Column({ type: DataType.ENUM(...Object.values(ShiftStatus)), allowNull: false, defaultValue: ShiftStatus.SCHEDULED })
  status!: ShiftStatus;

  @Column({ type: DataType.STRING(500), allowNull: true })
  notes?: string;

  @ForeignKey(() => Department)
  @Column({ type: DataType.UUID, allowNull: true })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  created_by?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
