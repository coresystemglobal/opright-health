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


export enum RecordType {
  ENCOUNTER = 'encounter',
  PROCEDURE = 'procedure',
  DIAGNOSIS = 'diagnosis',
  IMMUNIZATION = 'immunization',
  SURGERY = 'surgery',
  HOSPITALIZATION = 'hospitalization',
  EMERGENCY = 'emergency',
  OTHER = 'other'
}

@Table({
  tableName: 'medical_records',
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
      fields: ['record_type']
    },
    {
      fields: ['record_date']
    }
  ]
})
export class MedicalRecord extends Model {
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
    allowNull: true
  })
  doctor_id?: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @Column({
    type: DataType.ENUM(...Object.values(RecordType)),
    allowNull: false,
    defaultValue: RecordType.ENCOUNTER
  })
  record_type!: RecordType;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  findings?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Array of ICD-10 diagnosis codes'
  })
  icd10_codes?: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  procedures_performed?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  medications_prescribed?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  lab_results?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Array of file URLs or references'
  })
  attachments?: string[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  record_date!: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1
  })
  override version!: number;

  @ForeignKey(() => MedicalRecord)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  previous_version_id?: string;

  @BelongsTo(() => MedicalRecord, 'previous_version_id')
  previous_version?: MedicalRecord;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_confidential!: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  created_by!: string;

  @BelongsTo(() => User, 'created_by')
  creator?: User;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get is_recent(): boolean {
    const recordDate = new Date(this.record_date);
    const now = new Date();
    const daysDiff = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  }

  get has_attachments(): boolean {
    return !!this.attachments && this.attachments.length > 0;
  }

  // Create new version
  async createNewVersion(updates: Partial<MedicalRecord>, userId: string): Promise<MedicalRecord> {
    const newVersion = await MedicalRecord.create({
      ...this.toJSON(),
      id: undefined,
      version: this.version + 1,
      previous_version_id: this.id,
      created_by: userId,
      createdAt: undefined,
      updatedAt: undefined,
      ...updates
    });

    return newVersion;
  }
}
