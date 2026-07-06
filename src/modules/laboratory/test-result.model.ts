import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  Index,
  BeforeCreate,
  BeforeUpdate
} from 'sequelize-typescript';
import { User } from '@modules/users/user.model';

import { TestResultStatus, ReferenceRange } from '@appTypes/laboratory.types';
import { Op, fn, col } from 'sequelize';

// Forward declaration to handle circular dependency
interface ITestOrder {
  id: string;
  patient_id: string;
  doctor_id: string;
  lab_test_id: string;
  // Add other properties as needed
}

@Table({
  tableName: 'test_results',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['test_order_id']
    },
    {
      fields: ['parameter_name']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_critical']
    },
    {
      fields: ['performed_at']
    },
    {
      fields: ['numeric_value']
    },
    {
      unique: true,
      fields: ['test_order_id', 'parameter_name'],
      where: {
        deleted_at: null
      }
    }
  ]
})
export class TestResult extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @ForeignKey(() => getTestOrderModel())
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  test_order_id!: string;

  @BelongsTo(() => getTestOrderModel())
  test_order?: ITestOrder;

  @Column({
    type: DataType.STRING(200),
    allowNull: false
  })
  parameter_name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  value!: string;

  @Column({
    type: DataType.DECIMAL(15, 6),
    allowNull: true
  })
  numeric_value?: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  units?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  reference_range?: ReferenceRange;

  @Column({
    type: DataType.ENUM(...Object.values(TestResultStatus)),
    allowNull: false,
    defaultValue: TestResultStatus.PENDING
  })
  status!: TestResultStatus;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  is_critical!: boolean;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
    defaultValue: []
  })
  flags?: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  performed_at?: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  performed_by?: string;

  @BelongsTo(() => User, 'performed_by')
  performer?: User;

  @Column({
    type: DataType.STRING(200),
    allowNull: true
  })
  equipment_used?: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true
  })
  method?: string;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    defaultValue: 1.0
  })
  dilution_factor?: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  quality_control_passed!: boolean;

  // Virtual fields
  get formatted_value(): string {
    if (this.numeric_value && this.units) {
      return `${this.numeric_value} ${this.units}`;
    }
    return this.value;
  }

  get is_normal(): boolean {
    return this.status === TestResultStatus.NORMAL;
  }

  get is_abnormal(): boolean {
    return this.status === TestResultStatus.ABNORMAL || this.status === TestResultStatus.CRITICAL;
  }

  get reference_display(): string {
    if (!this.reference_range) return '';
    
    const range = this.reference_range;
    if (range.min_value !== undefined && range.max_value !== undefined) {
      return `${range.min_value} - ${range.max_value} ${range.units || this.units || ''}`;
    }
    if (range.text_value) {
      return range.text_value;
    }
    return '';
  }

  get deviation_from_normal(): number | null {
    if (!this.numeric_value || !this.reference_range) return null;
    
    const range = this.reference_range;
    if (range.min_value !== undefined && range.max_value !== undefined) {
      const midpoint = (range.min_value + range.max_value) / 2;
      return ((this.numeric_value - midpoint) / midpoint) * 100;
    }
    
    return null;
  }

  // Instance methods
  evaluateResult(): void {
    if (!this.reference_range || !this.numeric_value) {
      this.status = TestResultStatus.INCONCLUSIVE;
      return;
    }

    const range = this.reference_range;
    const value = this.numeric_value;

    // Check critical values first
    if (range.is_critical_low && value <= range.min_value!) {
      this.status = TestResultStatus.CRITICAL;
      this.is_critical = true;
      this.flags = [...(this.flags || []), 'CRITICAL_LOW'];
    } else if (range.is_critical_high && value >= range.max_value!) {
      this.status = TestResultStatus.CRITICAL;
      this.is_critical = true;
      this.flags = [...(this.flags || []), 'CRITICAL_HIGH'];
    } else if (range.min_value !== undefined && range.max_value !== undefined) {
      // Normal range evaluation
      if (value >= range.min_value && value <= range.max_value) {
        this.status = TestResultStatus.NORMAL;
      } else {
        this.status = TestResultStatus.ABNORMAL;
        if (value < range.min_value) {
          this.flags = [...(this.flags || []), 'LOW'];
        } else {
          this.flags = [...(this.flags || []), 'HIGH'];
        }
      }
    } else {
      this.status = TestResultStatus.INCONCLUSIVE;
    }
  }

  addFlag(flag: string): void {
    if (!this.flags) this.flags = [];
    if (!this.flags.includes(flag)) {
      this.flags.push(flag);
    }
  }

  removeFlag(flag: string): void {
    if (this.flags) {
      this.flags = this.flags.filter(f => f !== flag);
    }
  }

  hasFlag(flag: string): boolean {
    return Boolean(this.flags?.includes(flag));
  }

  // Static methods
  static async getCriticalResults(): Promise<TestResult[]> {
    const TestOrderModel = getTestOrderModel();
    
    return this.findAll({
      where: { is_critical: true },
      include: [
        {
          model: TestOrderModel,
          include: ['patient', 'doctor', 'lab_test']
        }
      ],
      order: [['performed_at', 'DESC']]
    });
  }

  static async getResultsByPatient(patientId: string, dateRange?: { start: Date; end: Date }): Promise<TestResult[]> {
    const TestOrderModel = getTestOrderModel();
    
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.performed_at = {
        [Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: TestOrderModel,
          where: { patient_id: patientId },
          include: ['lab_test']
        }
      ],
      order: [['performed_at', 'DESC']]
    });
  }

  static async getAbnormalResults(dateRange?: { start: Date; end: Date }): Promise<TestResult[]> {
    const TestOrderModel = getTestOrderModel();
    
    const whereClause: any = {
      status: {
        [Op.in]: [TestResultStatus.ABNORMAL, TestResultStatus.CRITICAL]
      }
    };

    if (dateRange) {
      whereClause.performed_at = {
        [Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: TestOrderModel,
          include: ['patient', 'doctor', 'lab_test']
        }
      ],
      order: [['performed_at', 'DESC']]
    });
  }

  static async getResultsByTest(testCode: string, dateRange?: { start: Date; end: Date }): Promise<TestResult[]> {
    const TestOrderModel = getTestOrderModel();
    const LabTestModel = getLabTestModel();
    
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.performed_at = {
        [Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: TestOrderModel,
          include: [
            {
              model: LabTestModel,
              where: { test_code: testCode }
            },
            'patient'
          ]
        }
      ],
      order: [['performed_at', 'DESC']]
    });
  }

  // Quality control methods
  static async getQualityControlSummary(dateRange: { start: Date; end: Date }): Promise<any> {
    const results = await this.findAll({
      where: {
        performed_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      },
      attributes: [
        'quality_control_passed',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['quality_control_passed']
    });

    return results;
  }

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async evaluateResultStatus(instance: TestResult) {
    if (instance.changed('numeric_value') || instance.changed('reference_range')) {
      instance.evaluateResult();
    }
  }
}

// Lazy loading function to get TestOrder model
function getTestOrderModel() {
  return require('./test-order.model').TestOrder;
}

// Lazy loading function to get LabTest model
function getLabTestModel() {
  return require('./lab-test.model').LabTest;
}