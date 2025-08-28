import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from 'sequelize-typescript';
import { Appointment } from '../appointment/appointment.model';
import { Patient } from '../patient/patient.model';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'POS';
type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

@Table({
  tableName: 'payments',
  timestamps: true,
  paranoid: true,
  underscored: true,
  freezeTableName: true,
})
export class Payment extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    allowNull: false
  })
  id!: string;

  @ForeignKey(() => Patient)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  appointment_id!: number;

  @BelongsTo(() => Appointment)
  appointment?: Appointment;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'NGN',
  })
  currency!: Currency;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  })
  payment_status!: PaymentStatus;
  
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  payment_provider!: string;

  @Column({
    type: DataType.ENUM('credit_card', 'debit_card', 'bank_transfer', 'cash', 'USSD', 'paypal'),
    allowNull: false,
  })
  payment_method!: PaymentMethod;

  @Column({
    type: DataType.STRING
  })
  reference!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  payment_date!: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
  })
  refund_amount?: number;

  @Column({
    type: DataType.JSON,
  })
  payment_data?: string 

  @Column(DataType.DATE)
  refund_date?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}