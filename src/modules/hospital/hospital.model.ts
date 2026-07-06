import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  HasMany,
  Index
} from 'sequelize-typescript';
import { Op } from 'sequelize';

export enum HospitalType {
  GENERAL = 'general',
  SPECIALTY = 'specialty',
  CLINIC = 'clinic',
  EMERGENCY = 'emergency',
  REHABILITATION = 'rehabilitation',
  PSYCHIATRIC = 'psychiatric',
  PEDIATRIC = 'pediatric',
  MATERNITY = 'maternity'
}

export enum AccreditationStatus {
  ACCREDITED = 'accredited',
  PROVISIONAL = 'provisional',
  NOT_ACCREDITED = 'not_accredited',
  UNDER_REVIEW = 'under_review'
}

@Table({
  tableName: 'hospitals',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['license_number']
    },
    {
      fields: ['hospital_type']
    },
    {
      fields: ['accreditation_status']
    },
    {
      fields: ['is_active']
    }
  ]
})
export class Hospital extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  short_name?: string;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true
  })
  license_number!: string;

  @Column({
    type: DataType.ENUM(...Object.values(HospitalType)),
    allowNull: false,
    defaultValue: HospitalType.GENERAL
  })
  hospital_type!: HospitalType;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  address!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  city!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  state!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false
  })
  postal_code!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  country!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false
  })
  phone!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true
  })
  emergency_phone?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  })
  email!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true
    }
  })
  website?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10000
    }
  })
  bed_capacity?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  })
  icu_beds?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 50
    }
  })
  emergency_beds?: number;

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
  is_24_hours!: boolean;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '08:00:00'
  })
  visiting_hours_start?: string;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    defaultValue: '20:00:00'
  })
  visiting_hours_end?: string;

  @Column({
    type: DataType.ENUM(...Object.values(AccreditationStatus)),
    allowNull: false,
    defaultValue: AccreditationStatus.NOT_ACCREDITED
  })
  accreditation_status!: AccreditationStatus;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  accrediting_body?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  accreditation_date?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  accreditation_expiry?: Date;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true
  })
  services_offered?: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true
  })
  specialties?: string[];

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  contact_persons?: ContactPerson[];

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  operating_hours?: OperatingHours;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true
  })
  latitude?: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true
  })
  longitude?: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  tax_id?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  registration_number?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  insurance_networks?: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  mission_statement?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  established_date?: Date;

  // Virtual fields
  get full_address(): string {
    return `${this.address}, ${this.city}, ${this.state} ${this.postal_code}, ${this.country}`;
  }

  get display_name(): string {
    return this.short_name || this.name;
  }

  get years_in_operation(): number {
    if (!this.established_date) return 0;
    const today = new Date();
    const established = new Date(this.established_date);
    return today.getFullYear() - established.getFullYear();
  }

  get is_accredited(): boolean {
    return this.accreditation_status === AccreditationStatus.ACCREDITED;
  }

  get accreditation_valid(): boolean {
    if (!this.is_accredited || !this.accreditation_expiry) return false;
    return new Date() < new Date(this.accreditation_expiry);
  }

  // Instance methods
  isServiceAvailable(service: string): boolean {
    return this.services_offered ? this.services_offered.includes(service) : false;
  }

  hasSpecialty(specialty: string): boolean {
    return this.specialties ? this.specialties.includes(specialty) : false;
  }

  isWithinVisitingHours(time: string): boolean {
    if (this.is_24_hours) return true;
    if (!this.visiting_hours_start || !this.visiting_hours_end) return true;
    
    return time >= this.visiting_hours_start && time <= this.visiting_hours_end;
  }

  getOccupancyRate(): number {
    // This would typically be calculated based on current admissions
    // For now, returning 0 as placeholder
    return 0;
  }

  getContactPerson(role: string): ContactPerson | undefined {
    return this.contact_persons?.find(person => person.role === role);
  }

  // Static methods
  static async findByLicenseNumber(licenseNumber: string): Promise<Hospital | null> {
    return Hospital.findOne({
      where: { license_number: licenseNumber }
    });
  }

  static async findActiveHospitals(): Promise<Hospital[]> {
    return Hospital.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });
  }

  static async findByType(hospitalType: HospitalType): Promise<Hospital[]> {
    return Hospital.findAll({
      where: { 
        hospital_type: hospitalType,
        is_active: true 
      },
      order: [['name', 'ASC']]
    });
  }

  static async findNearLocation(lat: number, lng: number, radiusKm: number = 50): Promise<Hospital[]> {
    // Simple distance calculation - in production, use PostGIS or similar
    return Hospital.findAll({
      where: {
        is_active: true,
        latitude: {
          [Op.between]: [lat - radiusKm/111, lat + radiusKm/111]
        },
        longitude: {
          [Op.between]: [lng - radiusKm/111, lng + radiusKm/111]
        }
      },
      order: [['name', 'ASC']]
    });
  }
}

// Interfaces for complex JSON fields
export interface ContactPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
  department?: string;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  is_closed: boolean;
}