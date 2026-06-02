import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TriageSession } from '@modules/triage/triage-session.model';

import { TriageQuestion } from '@modules/triage/triage-question.model';


@Table({
  tableName: 'triage_answers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  paranoid: false,
  freezeTableName: true
})
export class TriageAnswer extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => TriageSession)
  @Column({ type: DataType.UUID, allowNull: false })
  session_id!: string;

  @BelongsTo(() => TriageSession)
  session?: TriageSession;

  @ForeignKey(() => TriageQuestion)
  @Column({ type: DataType.UUID, allowNull: false })
  question_id!: string;

  @BelongsTo(() => TriageQuestion)
  question?: TriageQuestion;

  @Column({ type: DataType.JSONB, allowNull: false })
  answer_value!: unknown;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  created_at!: Date;
}
