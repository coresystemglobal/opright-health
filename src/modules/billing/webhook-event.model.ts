import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Idempotency ledger for inbound gateway webhooks. Each (provider, event_key)
 * is recorded once; a duplicate delivery is detected via the unique index and
 * skipped, so a re-sent charge.success can't double-apply. This is stronger
 * than the previous status-only guard.
 */
@Table({
  tableName: 'webhook_events',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { unique: true, fields: ['provider', 'event_key'], name: 'webhook_events_provider_key_uq' }
  ]
})
export class WebhookEvent extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  provider!: string;

  // Gateway event identity (e.g. `${event}:${reference|id|subscription_code}`).
  @Column({ type: DataType.STRING(200), allowNull: false })
  event_key!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  event_type?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  processed_at!: Date;

  /**
   * Record an event the first time only. Returns true if this is a NEW event
   * (caller should process it), false if it was already recorded (skip).
   */
  static async recordOnce(provider: string, eventKey: string, eventType?: string): Promise<boolean> {
    try {
      const [, created] = await WebhookEvent.findOrCreate({
        where: { provider, event_key: eventKey },
        defaults: { provider, event_key: eventKey, event_type: eventType, processed_at: new Date() } as any
      });
      return created;
    } catch {
      // Unique-violation race → treat as duplicate.
      return false;
    }
  }
}
