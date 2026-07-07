import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey
} from 'sequelize-typescript';
import { Prescription } from '@modules/clinical/prescription.model';
import { MedicationRoute, MedicationFrequency } from '@modules/clinical/medication.model';

@Table({
  tableName: 'prescription_items',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['prescription_id'] }
  ]
})
export class PrescriptionItem extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => Prescription)
  @Column({ type: DataType.UUID, allowNull: false })
  prescription_id!: string;

  @BelongsTo(() => Prescription)
  prescription?: Prescription;

  @Column({ type: DataType.STRING(200), allowNull: false })
  medication_name!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  dosage!: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  strength?: string;

  @Column({
    type: DataType.ENUM(...Object.values(MedicationRoute)),
    allowNull: false,
    defaultValue: MedicationRoute.ORAL
  })
  route!: MedicationRoute;

  @Column({
    type: DataType.ENUM(...Object.values(MedicationFrequency)),
    allowNull: false
  })
  frequency!: MedicationFrequency;

  @Column({ type: DataType.STRING(100), allowNull: true, comment: 'e.g. "7 days", "2 weeks"' })
  duration?: string;

  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'Quantity to dispense' })
  quantity?: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  instructions?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_dispensed!: boolean;

  @Column({ type: DataType.INTEGER, allowNull: true })
  dispensed_quantity?: number;

  declare createdAt: Date;
  declare updatedAt: Date;
}
