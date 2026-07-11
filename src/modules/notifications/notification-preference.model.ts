import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';
import { Tenant } from '@modules/tenancy/tenant.model';

export interface ChannelPreferences {
  in_app?: boolean;
  push?: boolean;
  email?: boolean;
  sms?: boolean;
}

export const DEFAULT_CHANNEL_PREFERENCES: Required<ChannelPreferences> = {
  in_app: true,
  push: true,
  email: true,
  sms: false // SMS is opt-in per channel (cost); reminders honour it explicitly
};

/**
 * Per-user channel preferences. `channels` is the global default; `overrides`
 * can turn channels on/off per NotificationType (keyed by the type string).
 */
@Table({
  tableName: 'notification_preferences',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['user_id'], unique: true }
  ]
})
export class NotificationPreference extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  user_id!: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({ type: DataType.JSONB, allowNull: true })
  channels?: ChannelPreferences;

  @Column({ type: DataType.JSONB, allowNull: true, comment: 'Per-NotificationType channel overrides' })
  overrides?: Record<string, ChannelPreferences>;

  declare createdAt: Date;
  declare updatedAt: Date;

  /** Effective global channel prefs with defaults applied. */
  get effective_channels(): Required<ChannelPreferences> {
    const c = this.channels || {};
    return {
      in_app: c.in_app ?? DEFAULT_CHANNEL_PREFERENCES.in_app,
      push: c.push ?? DEFAULT_CHANNEL_PREFERENCES.push,
      email: c.email ?? DEFAULT_CHANNEL_PREFERENCES.email,
      sms: c.sms ?? DEFAULT_CHANNEL_PREFERENCES.sms
    };
  }
}
