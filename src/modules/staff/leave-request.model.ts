import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';
import { StaffProfile } from '@modules/staff/staff-profile.model';

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  COMPASSIONATE = 'compassionate',
  UNPAID = 'unpaid',
  STUDY = 'study',
  OTHER = 'other'
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

/**
 * A staff time-off request with an approval workflow. `days` is the inclusive
 * count of calendar days between start_date and end_date, stored so payroll
 * exports and balance calculations don't have to recompute it.
 */
@Table({
  tableName: 'staff_leave_requests',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['staff_id'] },
    { fields: ['status'] },
    { fields: ['start_date'] }
  ]
})
export class LeaveRequest extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => StaffProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  staff_id!: string;

  @BelongsTo(() => StaffProfile)
  staff?: StaffProfile;

  @Column({ type: DataType.ENUM(...Object.values(LeaveType)), allowNull: false, defaultValue: LeaveType.ANNUAL })
  leave_type!: LeaveType;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  start_date!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  end_date!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1, comment: 'Inclusive calendar-day count' })
  days!: number;

  @Column({ type: DataType.STRING(1000), allowNull: true })
  reason?: string;

  @Column({ type: DataType.ENUM(...Object.values(LeaveStatus)), allowNull: false, defaultValue: LeaveStatus.PENDING })
  status!: LeaveStatus;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  reviewed_by?: string;

  @BelongsTo(() => User, 'reviewed_by')
  reviewer?: User;

  @Column({ type: DataType.DATE, allowNull: true })
  reviewed_at?: Date;

  @Column({ type: DataType.STRING(1000), allowNull: true })
  review_notes?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
