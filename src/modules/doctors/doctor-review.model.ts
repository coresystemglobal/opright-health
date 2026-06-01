import {
  Table, Column, Model, DataType,
  ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { Tenant } from '@modules/tenancy/tenant.model';

@Table({
  tableName: 'doctor_reviews',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['doctor_id'] },
    { fields: ['user_id'] },
    { unique: true, fields: ['user_id', 'doctor_id'] }
  ]
})
export class DoctorReview extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id!: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Doctor)
  @Column({ type: DataType.UUID, allowNull: false })
  doctor_id!: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  })
  rating!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  comment?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;
}
