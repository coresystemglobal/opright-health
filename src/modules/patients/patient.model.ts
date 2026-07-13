import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  HasMany,
  BelongsTo,
  ForeignKey,
  BeforeCreate,
  Index
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { Tenant } from '@modules/tenancy/tenant.model';
import { encryptedColumn } from '@utils/encryption.util';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

@Table({
  tableName: 'patients',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['mrn']
    },
    {
      fields: ['email']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['first_name', 'last_name']
    }
  ]
})
export class Patient extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true
  })
  mrn!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  first_name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  last_name!: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  date_of_birth!: Date;

  @Column({
    type: DataType.ENUM(...Object.values(Gender)),
    allowNull: true
  })
  gender?: Gender;

  // Sensitive contact PII — encrypted at rest (AES-256-GCM). Not used in
  // search, so encryption is transparent. Email stays plaintext (searchable).
  @Column(encryptedColumn('phone'))
  phone?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  })
  email?: string;

  @Column(encryptedColumn('address'))
  address?: string;

  @Column(encryptedColumn('emergency_contact_name'))
  emergency_contact_name?: string;

  @Column(encryptedColumn('emergency_contact_phone'))
  emergency_contact_phone?: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  user_id?: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Patient has opted out of SMS notifications (reminders, etc.)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  sms_opt_out!: boolean;

  // NDPR/GDPR: set when the patient's direct identifiers have been redacted
  // (right to erasure) while clinical records are retained per law.
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_anonymized!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  anonymized_at?: Date;

  @HasMany(() => Appointment)
  appointments?: Appointment[];

  // Virtual fields for computed properties
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  get age(): number {
    if (!this.date_of_birth) return 0;
    const today = new Date();
    const birthDate = new Date(this.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Generate MRN before creating patient
  @BeforeCreate
  static async generateMRN(instance: Patient) {
    if (!instance.mrn) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      instance.mrn = `PAT${timestamp.slice(-6)}${random}`;
    }
  }

  // Instance method to get masked phone for privacy
  getMaskedPhone(): string {
    if (!this.phone) return '';
    const phone = this.phone.replace(/\D/g, '');
    if (phone.length >= 10) {
      return `***-***-${phone.slice(-4)}`;
    }
    return '***-****';
  }

  // Instance method to get masked email for privacy
  getMaskedEmail(): string {
    if (!this.email) return '';
    const [localPart, domain] = this.email.split('@');
    if (localPart.length <= 2) return `**@${domain}`;
    return `${localPart.slice(0, 2)}***@${domain}`;
  }
}