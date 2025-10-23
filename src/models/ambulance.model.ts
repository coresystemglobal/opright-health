import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { AmbulanceRequest } from './ambulance-request.model';

export enum AmbulanceStatus {
  AVAILABLE = 'available',
  EN_ROUTE = 'en_route',
  AT_SCENE = 'at_scene',
  TRANSPORTING = 'transporting',
  AT_HOSPITAL = 'at_hospital',
  MAINTENANCE = 'maintenance'
}

@Table({
  tableName: 'ambulances',
  timestamps: true,
  underscored: true
})
export class Ambulance extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true
  })
  vehicle_number!: string;

  @Column({
    type: DataType.ENUM(...Object.values(AmbulanceStatus)),
    defaultValue: AmbulanceStatus.AVAILABLE,
    allowNull: false
  })
  status!: AmbulanceStatus;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  driver_name?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true
  })
  driver_phone?: string;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true
  })
  current_latitude?: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true
  })
  current_longitude?: number;

  @HasMany(() => AmbulanceRequest)
  requests?: AmbulanceRequest[];
}
