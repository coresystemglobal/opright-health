import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TriageSession } from '@modules/triage/triage-session.model';

import { TriageResultExplanation, TriageRiskLevel } from '@appTypes/triage.types';

@Table({
  tableName: 'triage_results',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  paranoid: false,
  freezeTableName: true
})
export class TriageResult extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => TriageSession)
  @Column({ type: DataType.UUID, allowNull: false })
  session_id!: string;

  @BelongsTo(() => TriageSession)
  session?: TriageSession;

  @Column({ type: DataType.INTEGER, allowNull: false })
  score!: number;

  @Column({ type: DataType.ENUM('low', 'moderate', 'urgent', 'emergency'), allowNull: false })
  risk_level!: TriageRiskLevel;

  @Column({ type: DataType.TEXT, allowNull: false })
  recommendation!: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  explanation!: TriageResultExplanation;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  created_at!: Date;
}
