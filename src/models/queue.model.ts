import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Patient } from './patient.model';

export enum QueuePriority {
  EMERGENCY = 'emergency',
  DELIVERY = 'delivery',
  URGENT = 'urgent',
  NORMAL = 'normal'
}

@Table({
  tableName: 'queues',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tag_number'], unique: true },
    { fields: ['department', 'attended'] },
    { fields: ['priority', 'arrival_time'] }
  ]
})
export class Queue extends Model {
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

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true
  })
  tag_number!: string;

  @Column({
    type: DataType.ENUM(...Object.values(QueuePriority)),
    defaultValue: QueuePriority.NORMAL,
    allowNull: false
  })
  priority!: QueuePriority;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  department!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  arrival_time!: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false
  })
  attended!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  attended_time?: Date;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  room_number?: string;
}
