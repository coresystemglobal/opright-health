import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { TriageCondition, TriageRuleSeverity } from '@appTypes/triage.types';

@Table({
  tableName: 'triage_rules',
  timestamps: true,
  underscored: true,
  paranoid: false,
  freezeTableName: true
})
export class TriageRule extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  rule_code!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  symptom_group!: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  condition!: TriageCondition;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  weight!: number;

  @Column({ type: DataType.ENUM('low', 'moderate', 'high', 'critical'), allowNull: false })
  severity!: TriageRuleSeverity;

  @Column({ type: DataType.STRING, allowNull: true })
  action_override?: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;
}
