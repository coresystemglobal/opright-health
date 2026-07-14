import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';
import { Department } from '@modules/hospital/department.model';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  LOCUM = 'locum',
  INTERN = 'intern',
  VOLUNTEER = 'volunteer'
}

export enum EmploymentStatus {
  ACTIVE = 'active',
  PROBATION = 'probation',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated'
}

/**
 * HR employment record for a member of staff. Distinct from the User (auth)
 * and Doctor (clinical) records: a StaffProfile carries the administrative
 * employment data — job title, department, hire date, licence, status — and
 * links back to a User account when one exists.
 */
@Table({
  tableName: 'staff_profiles',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['employment_status'] },
    { fields: ['department_id'] },
    { fields: ['license_expiry'] },
    { fields: ['employee_no', 'tenant_id'], unique: true }
  ]
})
export class StaffProfile extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  // Human-readable employee number, unique within a tenant.
  @Column({ type: DataType.STRING(50), allowNull: false })
  employee_no!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  first_name!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  last_name!: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  job_title!: string;

  @Column({ type: DataType.ENUM(...Object.values(EmploymentType)), allowNull: false, defaultValue: EmploymentType.FULL_TIME })
  employment_type!: EmploymentType;

  @Column({ type: DataType.ENUM(...Object.values(EmploymentStatus)), allowNull: false, defaultValue: EmploymentStatus.ACTIVE })
  employment_status!: EmploymentStatus;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  hire_date!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  termination_date?: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email?: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone?: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  emergency_contact_name?: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  emergency_contact_phone?: string;

  // Professional licence / credential (nurses, doctors, pharmacists…).
  @Column({ type: DataType.STRING(100), allowNull: true })
  license_number?: string;

  @Column({ type: DataType.STRING(100), allowNull: true, comment: 'e.g. RN, MBBS, Pharmacist' })
  license_type?: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  license_expiry?: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, comment: 'Base salary / rate for payroll reference' })
  base_salary?: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  // Optional link to a login account; an HR record may exist before onboarding.
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  user_id?: string;

  @BelongsTo(() => User, 'user_id')
  user?: User;

  @ForeignKey(() => Department)
  @Column({ type: DataType.UUID, allowNull: true })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;

  get full_name(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }
}
