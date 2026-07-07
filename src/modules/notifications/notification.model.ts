import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';

export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  LAB_RESULT = 'lab_result',
  PRESCRIPTION_READY = 'prescription_ready',
  EMERGENCY = 'emergency',
  SYSTEM_ALERT = 'system_alert',
  PAYMENT_STATUS = 'payment_status'
}

/** Delivery channels a notification can fan out to. */
export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms'
}

@Table({
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['is_read'] },
    { fields: ['created_at'] }
  ]
})
export class Notification extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  // Null user_id => tenant-wide broadcast
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  user_id?: string;

  @BelongsTo(() => User)
  user?: User;

  @Column({ type: DataType.ENUM(...Object.values(NotificationType)), allowNull: false })
  type!: NotificationType;

  @Column({ type: DataType.STRING(200), allowNull: false })
  title!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message!: string;

  @Column({ type: DataType.JSONB, allowNull: true, comment: 'Arbitrary payload for deep-linking/context' })
  data?: Record<string, any>;

  // Channels this notification was actually delivered on
  @Column({ type: DataType.JSONB, allowNull: true })
  delivered_channels?: string[];

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_read!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  read_at?: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}
