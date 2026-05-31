import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  HasMany,
  Index
} from 'sequelize-typescript';
import { Doctor } from './doctor.model';
import { Tenant } from './tenant.model';
import { User } from './user.model';

@Table({
  tableName: 'departments',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['code', 'tenant_id']
    },
    {
      fields: ['name']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['head_of_department_id']
    }
  ]
})
export class Department extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false
  })
  code!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @ForeignKey(() => Doctor)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  head_of_department_id?: string;

  @BelongsTo(() => Doctor, 'head_of_department_id')
  head_of_department?: Doctor;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '08:00:00'
  })
  operating_hours_start?: string;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '18:00:00'
  })
  operating_hours_end?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Total bed capacity for inpatient departments'
  })
  bed_capacity?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Currently occupied beds'
  })
  beds_occupied?: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  location?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true
  })
  floor?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  phone_extension?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  email?: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get beds_available(): number {
    if (!this.bed_capacity) return 0;
    const occupied = this.beds_occupied || 0;
    return Math.max(0, this.bed_capacity - occupied);
  }

  get occupancy_rate(): number {
    if (!this.bed_capacity || this.bed_capacity === 0) return 0;
    const occupied = this.beds_occupied || 0;
    return (occupied / this.bed_capacity) * 100;
  }

  get is_full(): boolean {
    if (!this.bed_capacity) return false;
    const occupied = this.beds_occupied || 0;
    return occupied >= this.bed_capacity;
  }

  // Instance methods
  async allocateBed(): Promise<boolean> {
    if (this.is_full) {
      throw new Error('Department is at full capacity');
    }

    this.beds_occupied = (this.beds_occupied || 0) + 1;
    await this.save();
    return true;
  }

  async releaseBed(): Promise<boolean> {
    const currentOccupied = this.beds_occupied || 0;
    if (currentOccupied === 0) {
      throw new Error('No beds to release');
    }

    this.beds_occupied = currentOccupied - 1;
    await this.save();
    return true;
  }

  isOperating(time?: string): boolean {
    if (!this.operating_hours_start || !this.operating_hours_end) return true;
    
    const checkTime = time || new Date().toTimeString().split(' ')[0];
    return checkTime >= this.operating_hours_start && checkTime <= this.operating_hours_end;
  }
}
