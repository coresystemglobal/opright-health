import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { TriageCondition, TriageQuestionType } from '@appTypes/triage.types';

@Table({
  tableName: 'triage_questions',
  timestamps: true,
  underscored: true,
  paranoid: false,
  freezeTableName: true
})
export class TriageQuestion extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  code!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  text!: string;

  @Column({ type: DataType.ENUM('single', 'multi', 'boolean', 'number'), allowNull: false })
  type!: TriageQuestionType;

  @Column({ type: DataType.STRING(100), allowNull: false })
  symptom_group!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  order!: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  condition?: TriageCondition | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  options?: unknown[] | null;
}
