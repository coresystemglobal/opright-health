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

import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export enum AllergyType {
  FOOD = 'food',
  MEDICATION = 'medication',
  ENVIRONMENTAL = 'environmental',
  INSECT = 'insect',
  LATEX = 'latex',
  OTHER = 'other'
}

export enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening'
}

@Table({
  tableName: 'allergies',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['patient_id']
    },
    {
      fields: ['allergen_type']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['is_active']
    }
  ]
})
export class Allergy extends Model {
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

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  allergen_name!: string;

  @Column({
    type: DataType.ENUM(...Object.values(AllergyType)),
    allowNull: false,
    defaultValue: AllergyType.OTHER
  })
  allergen_type!: AllergyType;

  @Column({
    type: DataType.ENUM(...Object.values(AllergySeverity)),
    allowNull: false,
    defaultValue: AllergySeverity.MILD
  })
  severity!: AllergySeverity;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  reaction?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  symptoms?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  treatment?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  onset_date?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  recorded_by!: string;

  @BelongsTo(() => User, 'recorded_by')
  recorder?: User;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Virtual fields
  get is_critical(): boolean {
    return this.severity === AllergySeverity.SEVERE || 
           this.severity === AllergySeverity.LIFE_THREATENING;
  }

  get display_name(): string {
    return `${this.allergen_name} (${this.allergen_type})`;
  }
}
