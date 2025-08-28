import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  HasMany,
  HasOne,
  ForeignKey
} from 'sequelize-typescript';
import { Appointment } from '../appointment/appointment.model';
import { Patient } from '../patient/patient.model';

export enum UserRole {
  PATIENT = 'patient',
  ADMIN = 'admin',
  STAFF = 'staff',
  DOCTOR = 'doctor'
}

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  first_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  last_name!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    unique: true
  })
  username?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.PATIENT
  })
  role?: UserRole;

  @Column({
    type: DataType.STRING
  })
  phone?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  verified!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @HasOne(() => Patient)
  @ForeignKey(() => Patient)
  patient?: Patient;
}
