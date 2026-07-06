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

import { Tenant } from '@modules/tenancy/tenant.model';

export enum ResourceType {
  EXAMINATION_ROOM = 'examination_room',
  OPERATING_ROOM = 'operating_room',
  PROCEDURE_ROOM = 'procedure_room',
  CONSULTATION_ROOM = 'consultation_room',
  MEETING_ROOM = 'meeting_room',
  MEDICAL_EQUIPMENT = 'medical_equipment',
  DIAGNOSTIC_EQUIPMENT = 'diagnostic_equipment',
  OTHER = 'other'
}

export enum ResourceStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service',
  RESERVED = 'reserved'
}

@Table({
  tableName: 'resources',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['department_id']
    },
    {
      fields: ['resource_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_active']
    },
    {
      unique: true,
      fields: ['code', 'tenant_id']
    }
  ]
})
export class Resource extends Model {
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
    type: DataType.ENUM(...Object.values(ResourceType)),
    allowNull: false
  })
  resource_type!: ResourceType;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  department_id?: string;

  @BelongsTo(() => Department)
  department?: Department;

  @Column({
    type: DataType.ENUM(...Object.values(ResourceStatus)),
    allowNull: false,
    defaultValue: ResourceStatus.AVAILABLE
  })
  status!: ResourceStatus;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  location?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true
  })
  floor?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true
  })
  building?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Capacity/seats for rooms'
  })
  capacity?: number;

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
  requires_approval!: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Additional features/amenities'
  })
  features?: Record<string, any>;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '08:00:00'
  })
  available_from?: string;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '18:00:00'
  })
  available_until?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  last_maintenance_date?: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  next_maintenance_due?: Date;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get is_room(): boolean {
    return this.resource_type.includes('room');
  }

  get is_equipment(): boolean {
    return this.resource_type.includes('equipment');
  }

  get is_available_now(): boolean {
    return this.status === ResourceStatus.AVAILABLE && this.is_active;
  }

  get needs_maintenance(): boolean {
    if (!this.next_maintenance_due) return false;
    return new Date() >= new Date(this.next_maintenance_due);
  }

  // Instance methods
  async reserve(): Promise<void> {
    if (this.status !== ResourceStatus.AVAILABLE) {
      throw new Error(`Resource is not available. Current status: ${this.status}`);
    }
    this.status = ResourceStatus.RESERVED;
    await this.save();
  }

  async markInUse(): Promise<void> {
    if (this.status !== ResourceStatus.AVAILABLE && this.status !== ResourceStatus.RESERVED) {
      throw new Error(`Resource cannot be marked as in use. Current status: ${this.status}`);
    }
    this.status = ResourceStatus.IN_USE;
    await this.save();
  }

  async release(): Promise<void> {
    this.status = ResourceStatus.AVAILABLE;
    await this.save();
  }

  async markForMaintenance(): Promise<void> {
    this.status = ResourceStatus.MAINTENANCE;
    this.last_maintenance_date = new Date();
    await this.save();
  }

  isAvailableAt(time: string): boolean {
    if (!this.is_active || this.status !== ResourceStatus.AVAILABLE) return false;
    if (!this.available_from || !this.available_until) return true;
    
    return time >= this.available_from && time <= this.available_until;
  }
}
