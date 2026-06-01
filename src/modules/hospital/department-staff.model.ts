import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  Index
} from 'sequelize-typescript';
import { Department } from '@modules/hospital/department.model';

import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export enum DepartmentRole {
  STAFF = 'staff',
  SUPERVISOR = 'supervisor',
  MANAGER = 'manager',
  CONSULTANT = 'consultant',
  HEAD = 'head'
}

@Table({
  tableName: 'department_staff',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['department_id', 'user_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    }
  ]
})
export class DepartmentStaff extends Model<DepartmentStaff> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  department_id!: string;

  @BelongsTo(() => Department)
  department?: Department;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  user_id!: string;

  @BelongsTo(() => User)
  user?: User;

  @Column({
    type: DataType.ENUM(...Object.values(DepartmentRole)),
    allowNull: false,
    defaultValue: DepartmentRole.STAFF
  })
  role!: DepartmentRole;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  start_date!: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  end_date?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_primary_department!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  responsibilities?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get is_current(): boolean {
    if (!this.is_active) return false;
    if (!this.end_date) return true;
    return new Date() <= new Date(this.end_date);
  }

  get duration_days(): number | null {
    if (!this.end_date) return null;
    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Instance method
  async deactivate(endDate?: Date): Promise<void> {
    this.is_active = false;
    this.end_date = endDate || new Date();
    await this.save();
  }
}
