import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';
import { Tenant } from '@modules/tenancy/tenant.model';

export enum PushPlatform {
  /** Firebase Cloud Messaging — mobile (patient app). */
  FCM = 'fcm',
  /** VAPID Web Push — browsers (staff web). */
  WEB = 'web'
}

/**
 * A registered push destination for a user.
 *  - FCM: `token` holds the registration token; `subscription` is null.
 *  - WEB: `subscription` holds the PushSubscription JSON ({endpoint, keys});
 *         `token` mirrors the endpoint for uniqueness.
 */
@Table({
  tableName: 'push_subscriptions',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['platform'] },
    { fields: ['token'], unique: true }
  ]
})
export class PushSubscription extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id!: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({ type: DataType.ENUM(...Object.values(PushPlatform)), allowNull: false })
  platform!: PushPlatform;

  // FCM registration token, or the web-push endpoint (used as the unique key)
  @Column({ type: DataType.TEXT, allowNull: false, unique: true })
  token!: string;

  // Full web-push PushSubscription JSON ({endpoint, keys: {p256dh, auth}})
  @Column({ type: DataType.JSONB, allowNull: true })
  subscription?: Record<string, any>;

  @Column({ type: DataType.STRING(300), allowNull: true, comment: 'User agent / device label' })
  device_label?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}
