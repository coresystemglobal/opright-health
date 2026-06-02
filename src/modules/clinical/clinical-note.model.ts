import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  Index
} from 'sequelize-typescript';
import { Patient } from '@modules/patients/patient.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export enum NoteType {
  SOAP = 'soap',
  PROGRESS = 'progress',
  CONSULTATION = 'consultation',
  ADMISSION = 'admission',
  DISCHARGE = 'discharge',
  PROCEDURE = 'procedure',
  FOLLOW_UP = 'follow_up',
  OTHER = 'other'
}

interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

@Table({
  tableName: 'clinical_notes',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['patient_id']
    },
    {
      fields: ['appointment_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['note_type']
    },
    {
      fields: ['note_date']
    }
  ]
})
export class ClinicalNote extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Patient)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  appointment_id?: string;

  @BelongsTo(() => Appointment)
  appointment?: Appointment;

  @ForeignKey(() => Doctor)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  doctor_id!: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @Column({
    type: DataType.ENUM(...Object.values(NoteType)),
    allowNull: false,
    defaultValue: NoteType.PROGRESS
  })
  note_type!: NoteType;

  @Column({
    type: DataType.STRING(200),
    allowNull: true
  })
  title?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  chief_complaint?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'SOAP note structure: {subjective, objective, assessment, plan}'
  })
  soap_note?: SOAPNote;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  content?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  diagnosis?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  treatment_plan?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  prescriptions?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  follow_up_instructions?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  follow_up_date?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  note_date!: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_locked!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  locked_at?: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  created_by!: string;

  @BelongsTo(() => User, 'created_by')
  creator?: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  last_modified_by?: string;

  @BelongsTo(() => User, 'last_modified_by')
  modifier?: User;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Instance methods
  async lock(userId: string): Promise<void> {
    if (this.is_locked) {
      throw new Error('Note is already locked');
    }
    
    this.is_locked = true;
    this.locked_at = new Date();
    this.last_modified_by = userId;
    
    await this.save();
  }

  canEdit(userId: string): boolean {
    if (this.is_locked) return false;
    
    // Only creator or same doctor can edit within 24 hours
    const createdAt = new Date(this.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) return false;
    
    return this.created_by === userId || this.doctor_id === userId;
  }

  get is_soap_note(): boolean {
    return this.note_type === NoteType.SOAP;
  }

  get display_summary(): string {
    if (this.title) return this.title;
    if (this.chief_complaint) return `${this.note_type}: ${this.chief_complaint}`;
    return `${this.note_type} note`;
  }
}
