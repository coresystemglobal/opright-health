import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  Index,
  HasMany
} from 'sequelize-typescript';
import { TestCategory, SpecimenType } from '../types/laboratory.types';
import { Department } from './doctor.model';
import { Op } from 'sequelize';

@Table({
  tableName: 'lab_tests',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['test_code']
    },
    {
      fields: ['category']
    },
    {
      fields: ['department']
    },
    {
      fields: ['specimen_type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['price']
    }
  ]
})
export class LabTest extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true
  })
  test_code!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  test_name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.ENUM(...Object.values(TestCategory)),
    allowNull: false
  })
  category!: TestCategory;

  @Column({
    type: DataType.ENUM(...Object.values(SpecimenType)),
    allowNull: false
  })
  specimen_type!: SpecimenType;

  @Column({
    type: DataType.ENUM(...Object.values(Department)),
    allowNull: false,
    defaultValue: Department.LABORATORY
  })
  department!: Department;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  price!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 24,
    validate: {
      min: 1
    }
  })
  turnaround_time_hours!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  preparation_instructions?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  fasting_required!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  special_requirements?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  reference_ranges?: object[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @HasMany(() => require('./test-order.model').TestOrder)
  test_orders?: any[];

  // Virtual fields
  get formatted_price(): string {
    return `$${Number(this.price).toFixed(2)}`;
  }

  get estimated_completion(): Date {
    const now = new Date();
    now.setHours(now.getHours() + this.turnaround_time_hours);
    return now;
  }

  // Instance methods
  isAvailable(): boolean {
    return this.is_active;
  }

  requiresPreparation(): boolean {
    return Boolean(this.preparation_instructions) || this.fasting_required;
  }

  getPreparationInfo(): string {
    let info = '';
    if (this.fasting_required) {
      info += 'Fasting required (8-12 hours). ';
    }
    if (this.preparation_instructions) {
      info += this.preparation_instructions;
    }
    if (this.special_requirements) {
      info += ` Special requirements: ${this.special_requirements}`;
    }
    return info.trim();
  }

  calculatePriceWithTax(taxRate = 0.08): number {
    return Number(this.price) * (1 + taxRate);
  }

  // Static methods
  static async getActiveTests(): Promise<LabTest[]> {
    return this.findAll({
      where: { is_active: true },
      order: [['test_name', 'ASC']]
    });
  }

  static async getTestsByCategory(category: TestCategory): Promise<LabTest[]> {
    return this.findAll({
      where: { 
        category,
        is_active: true 
      },
      order: [['test_name', 'ASC']]
    });
  }

  static async getTestsByDepartment(department: Department): Promise<LabTest[]> {
    return this.findAll({
      where: { 
        department,
        is_active: true 
      },
      order: [['test_name', 'ASC']]
    });
  }

  static async searchTests(query: string): Promise<LabTest[]> {
    return this.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { test_name: { [Op.iLike]: `%${query}%` } },
          { test_code: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['test_name', 'ASC']]
    });
  }
}
