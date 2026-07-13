import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';

export enum ScheduledReportType {
  DIGEST = 'digest',                       // multi-section HTML summary
  FINANCIAL = 'financial',
  OPERATIONAL_METRICS = 'operational-metrics',
  TRENDS = 'trends',
  INVENTORY_VALUATION = 'inventory-valuation',
  PATIENT_DEMOGRAPHICS = 'patient-demographics',
  DOCTOR_PERFORMANCE = 'doctor-performance',
  APPOINTMENT_ANALYTICS = 'appointment-analytics'
}

export enum ScheduleFormat {
  HTML = 'html',   // inline in the email body
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf'
}

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

@Table({
  tableName: 'report_schedules',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['is_active'] },
    { fields: ['next_run_at'] }
  ]
})
export class ReportSchedule extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name!: string;

  @Column({ type: DataType.ENUM(...Object.values(ScheduledReportType)), allowNull: false })
  report_type!: ScheduledReportType;

  @Column({ type: DataType.ENUM(...Object.values(ScheduleFormat)), allowNull: false, defaultValue: ScheduleFormat.HTML })
  format!: ScheduleFormat;

  @Column({ type: DataType.ENUM(...Object.values(ScheduleFrequency)), allowNull: false, defaultValue: ScheduleFrequency.WEEKLY })
  frequency!: ScheduleFrequency;

  // Explicit recipient emails; when empty the tenant's admins are used.
  @Column({ type: DataType.JSONB, allowNull: true })
  recipients?: string[];

  // Report-specific params, e.g. { metric: 'revenue', period: 'monthly' } for trends
  @Column({ type: DataType.JSONB, allowNull: true })
  params?: Record<string, any>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @Column({ type: DataType.DATE, allowNull: false })
  next_run_at!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  last_run_at?: Date;

  @Column({ type: DataType.STRING(500), allowNull: true })
  last_run_status?: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  created_by?: string;

  @BelongsTo(() => User, 'created_by')
  creator?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
