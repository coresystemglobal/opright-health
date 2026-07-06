import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TriageSession } from '@modules/triage/triage-session.model';


@Table({
  tableName: 'triage_audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  paranoid: false,
  freezeTableName: true
})
export class TriageAuditLog extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => TriageSession)
  @Column({ type: DataType.UUID, allowNull: false })
  session_id!: string;

  @BelongsTo(() => TriageSession)
  session?: TriageSession;

  @Column({ type: DataType.STRING(100), allowNull: false })
  event_type!: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  payload!: Record<string, unknown>;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  created_at!: Date;
}
