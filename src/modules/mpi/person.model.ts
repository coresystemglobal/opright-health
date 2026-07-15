import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';

/**
 * Master Patient Index (MPI) — a global, cross-tenant person identity.
 *
 * A `Person` represents one real human. Each hospital (tenant) still keeps its
 * own tenant-scoped `Patient` record; those records link up to a single
 * `Person` via `Patient.person_id`, which is what lets the same human be
 * recognized across hospitals (with consent — see cross-tenant sharing).
 *
 * This table is deliberately NOT tenant-scoped. Uniqueness on the identity
 * keys (national_id / verified_email / verified_phone) is enforced by PARTIAL
 * unique indexes created in the migration (unique only when the value is
 * present and the row is not a merged tombstone) — they cannot be expressed as
 * sequelize-typescript decorators, so they live in the migration only.
 */
export enum PersonGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown'
}

export enum PersonStatus {
  PROVISIONAL = 'provisional', // linked with no proofed identity yet
  VERIFIED = 'verified',       // proofed via national_id or verified contact
  MERGED = 'merged',           // duplicate merged into `merged_into_id`
  DEACTIVATED = 'deactivated'
}

@Table({
  tableName: 'persons',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    // Non-unique helper for admin candidate search. The unique identity-key
    // indexes are partial and defined in the migration (raw SQL).
    { fields: ['last_name', 'date_of_birth'] },
    { fields: ['status'] }
  ]
})
export class Person extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  // Strong identity key (Nigeria NIN). Deterministic auto-match key.
  @Column({ type: DataType.STRING(30), allowNull: true })
  national_id?: string;

  // Only set once platform-verified.
  @Column({ type: DataType.STRING(255), allowNull: true })
  verified_email?: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  verified_phone?: string;

  // Demographic snapshot for display/search. The tenant `Patient` rows remain
  // the source of truth for clinical fields.
  @Column({ type: DataType.STRING(100), allowNull: true })
  first_name?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  middle_name?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  last_name?: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  date_of_birth?: string;

  @Column({ type: DataType.ENUM(...Object.values(PersonGender)), allowNull: true })
  gender?: PersonGender;

  @Column({ type: DataType.ENUM(...Object.values(PersonStatus)), allowNull: false, defaultValue: PersonStatus.PROVISIONAL })
  status!: PersonStatus;

  // Tombstone pointer: when this Person is merged into a survivor.
  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: true })
  merged_into_id?: string;

  @BelongsTo(() => Person, 'merged_into_id')
  merged_into?: Person;

  declare createdAt: Date;
  declare updatedAt: Date;
}
