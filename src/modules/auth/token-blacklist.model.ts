import {
  Table,
  Column,
  Model,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'token_blacklist',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['expires_at'] },
    { fields: ['jti'] },
  ],
})
export class TokenBlacklist extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  override id!: string;

  /** The JWT ID (jti) or the full token hash to identify the blacklisted token */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  jti!: string;

  /** The user whose token was blacklisted */
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id!: string;

  /** Token type for clarity (always 'refresh' for now) */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'refresh',
  })
  token_type!: string;

  /** When the token was blacklisted */
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  blacklisted_at!: Date;

  /** When the token naturally expires (used for cleanup) */
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expires_at!: Date;
}
