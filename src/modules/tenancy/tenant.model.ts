import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Patient } from '@modules/patients/patient.model';


export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface ReminderSettings {
  enabled?: boolean;
  /** Lead time in hours for the first ("long") reminder. */
  long_lead_hours?: number;
  /** Lead time in hours for the second ("short") reminder. */
  short_lead_hours?: number;
}

export const DEFAULT_REMINDER_SETTINGS: Required<ReminderSettings> = {
  enabled: true,
  long_lead_hours: 24,
  short_lead_hours: 2
};

@Table({
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class Tenant extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true
  })
  subdomain!: string;

  @Column({
    type: DataType.ENUM(...Object.values(TenantStatus)),
    allowNull: false,
    defaultValue: TenantStatus.ACTIVE
  })
  status!: TenantStatus;

  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  contact_email!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false
  })
  contact_phone!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  address?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  stripe_customer_id?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Appointment reminder config: {enabled, long_lead_hours, short_lead_hours}'
  })
  reminder_settings?: ReminderSettings;

  @HasMany(() => User)
  users?: User[];

  @HasMany(() => Patient)
  patients?: Patient[];

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  /**
   * Effective reminder settings, applying defaults for any unset field.
   * Reminders default ON at 24h and 2h before the appointment.
   */
  get effective_reminder_settings(): Required<ReminderSettings> {
    const s = this.reminder_settings || {};
    return {
      enabled: s.enabled !== undefined ? s.enabled : DEFAULT_REMINDER_SETTINGS.enabled,
      long_lead_hours: s.long_lead_hours ?? DEFAULT_REMINDER_SETTINGS.long_lead_hours,
      short_lead_hours: s.short_lead_hours ?? DEFAULT_REMINDER_SETTINGS.short_lead_hours
    };
  }
}