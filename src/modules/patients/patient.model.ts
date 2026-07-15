import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  HasMany,
  BelongsTo,
  ForeignKey,
  BeforeCreate
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';
import { Person } from '@modules/mpi/person.model';

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
      fields: ['tenant_id', 'mrn'],
      name: 'patients_tenant_mrn_uq'
    },
    {
      fields: ['person_id']
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

  // MRN is unique PER TENANT (composite index in @Table.indexes above), not
  // globally — the same code may exist at two different hospitals.
  @Column({
    type: DataType.STRING(20),
    allowNull: false
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

  // Link to the global MPI Person identity (nullable until matched/linked).
  @ForeignKey(() => Person)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  person_id?: string;

  @BelongsTo(() => Person)
  person?: Person;

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

  // Generate a per-tenant MRN before create: `PAT` + a zero-padded 6-digit
  // sequence, unique within the tenant. Uniqueness is enforced per-tenant by
  // the (tenant_id, mrn) index; this picks the next free number with a bounded
  // retry, and the index is the backstop against a concurrent-insert race.
  @BeforeCreate
  static async generateMRN(instance: Patient) {
    if (instance.mrn) return;
    const model = instance.constructor as typeof Patient;
    const tenantId = instance.tenant_id;
    const base = await model.count({ where: { tenant_id: tenantId }, paranoid: false });
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = `PAT${String(base + 1 + attempt).padStart(6, '0')}`;
      const clash = await model.count({ where: { tenant_id: tenantId, mrn: candidate }, paranoid: false });
      if (!clash) {
        instance.mrn = candidate;
        return;
      }
    }
    // Fallback: random 6-digit within the tenant (index still guarantees uniqueness).
    instance.mrn = `PAT${Math.floor(100000 + Math.random() * 900000)}`;
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