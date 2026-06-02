import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Tenant } from '@modules/tenancy/tenant.model';
import { User } from '@modules/users/user.model';


export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  REPORT = 'report',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab_result'
}

@Table({
  tableName: 'files',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class File extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  original_name!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false
  })
  file_key!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false
  })
  file_url!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  content_type!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  file_size!: number;

  @Column({
    type: DataType.ENUM(...Object.values(FileType)),
    allowNull: false
  })
  file_type!: FileType;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  uploaded_by!: string;

  @BelongsTo(() => User)
  uploader?: User;

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;
}