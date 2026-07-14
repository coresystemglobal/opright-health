import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';
import { StaffProfile } from '@modules/staff/staff-profile.model';

export enum ReviewType {
  ANNUAL = 'annual',
  PROBATION = 'probation',
  QUARTERLY = 'quarterly',
  MID_YEAR = 'mid_year',
  AD_HOC = 'ad_hoc'
}

/**
 * Review lifecycle:
 *   draft → submitted → acknowledged → finalized
 * A reviewer drafts and submits; the staff member acknowledges (optionally
 * adding comments); HR/the reviewer finalizes. Ratings become immutable once
 * finalized.
 */
export enum ReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  FINALIZED = 'finalized'
}

@Table({
  tableName: 'staff_performance_reviews',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['staff_id'] },
    { fields: ['reviewer_id'] },
    { fields: ['status'] },
    { fields: ['period_end'] }
  ]
})
export class PerformanceReview extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  override id!: string;

  @ForeignKey(() => StaffProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  staff_id!: string;

  @BelongsTo(() => StaffProfile)
  staff?: StaffProfile;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  reviewer_id?: string;

  @BelongsTo(() => User, 'reviewer_id')
  reviewer?: User;

  @Column({ type: DataType.ENUM(...Object.values(ReviewType)), allowNull: false, defaultValue: ReviewType.ANNUAL })
  review_type!: ReviewType;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  period_start!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  period_end!: string;

  @Column({ type: DataType.ENUM(...Object.values(ReviewStatus)), allowNull: false, defaultValue: ReviewStatus.DRAFT })
  status!: ReviewStatus;

  // Overall score on a 1–5 scale.
  @Column({ type: DataType.INTEGER, allowNull: true })
  overall_rating?: number;

  // Per-competency scores, e.g. { clinical_skill: 4, teamwork: 5, punctuality: 3 }
  @Column({ type: DataType.JSONB, allowNull: true })
  ratings?: Record<string, number>;

  @Column({ type: DataType.TEXT, allowNull: true })
  strengths?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  areas_for_improvement?: string;

  // Free-form or structured goals for the next period.
  @Column({ type: DataType.JSONB, allowNull: true })
  goals?: any;

  @Column({ type: DataType.TEXT, allowNull: true })
  reviewer_comments?: string;

  // Added by the staff member when acknowledging.
  @Column({ type: DataType.TEXT, allowNull: true })
  staff_comments?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  submitted_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  acknowledged_at?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  finalized_at?: Date;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  declare createdAt: Date;
  declare updatedAt: Date;
}
