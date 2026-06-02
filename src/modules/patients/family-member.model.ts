import {
  Table, Column, Model, DataType,
  ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { Tenant } from '@modules/tenancy/tenant.model';

export enum FamilyRelationship {
  CHILD = 'child',
  SPOUSE = 'spouse',
  PARENT = 'parent',
  SIBLING = 'sibling',
  GRANDPARENT = 'grandparent',
  GRANDCHILD = 'grandchild',
  OTHER = 'other'
}

@Table({
  tableName: 'family_members',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['tenant_id'] }
  ]
})
export class FamilyMember extends Model {
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

  @Column({ type: DataType.STRING(100), allowNull: false })
  first_name!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  last_name!: string;

  @Column({
    type: DataType.ENUM(...Object.values(FamilyRelationship)),
    allowNull: false
  })
  relationship!: FamilyRelationship;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  date_of_birth?: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  blood_type?: string;

  @Column({ type: DataType.STRING(10), allowNull: true })
  gender?: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  phone?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  allergies?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  medical_notes?: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}
