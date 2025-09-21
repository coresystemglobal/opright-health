import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  HasMany,
  Index,
  BeforeCreate,
  BeforeUpdate
} from 'sequelize-typescript';
import { Patient } from './patient.model';
import { Doctor } from './doctor.model';
import { User } from './user.model';
import { Appointment } from './appointment.model';
import { LabTest } from './lab-test.model';
import { TestResult } from './test-result.model';
import { TestOrderStatus, TestUrgency } from '../types/laboratory.types';
import { Op } from 'sequelize';

@Table({
  tableName: 'test_orders',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['order_number']
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['lab_test_id']
    },
    {
      fields: ['appointment_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['urgency']
    },
    {
      fields: ['specimen_collected_at']
    },
    {
      fields: ['results_available_at']
    },
    {
      fields: ['created_at']
    }
  ]
})
export class TestOrder extends Model {
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
  order_number!: string;

  @ForeignKey(() => Patient)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  patient_id!: string;

  @BelongsTo(() => Patient)
  patient?: Patient;

  @ForeignKey(() => Doctor)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  doctor_id!: string;

  @BelongsTo(() => Doctor)
  doctor?: Doctor;

  @ForeignKey(() => LabTest)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  lab_test_id!: string;

  @BelongsTo(() => LabTest)
  lab_test?: LabTest;

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  appointment_id?: string;

  @BelongsTo(() => Appointment)
  appointment?: Appointment;

  @Column({
    type: DataType.ENUM(...Object.values(TestOrderStatus)),
    allowNull: false,
    defaultValue: TestOrderStatus.ORDERED
  })
  status!: TestOrderStatus;

  @Column({
    type: DataType.ENUM(...Object.values(TestUrgency)),
    allowNull: false,
    defaultValue: TestUrgency.ROUTINE
  })
  urgency!: TestUrgency;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  clinical_notes?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  special_instructions?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  specimen_collected_at?: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  collected_by?: string;

  @BelongsTo(() => User, 'collected_by')
  collector?: User;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  collection_notes?: string;

  @Column({
    type: DataType.ENUM('good', 'fair', 'poor'),
    allowNull: true
  })
  specimen_quality?: 'good' | 'fair' | 'poor';

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  rejection_reason?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  results_available_at?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  technician_notes?: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  reviewed_by?: string;

  @BelongsTo(() => User, 'reviewed_by')
  reviewer?: User;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  reviewed_at?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  critical_values_notified!: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  created_by!: string;

  @BelongsTo(() => User, 'created_by')
  creator?: User;

  @HasMany(() => TestResult)
  test_results?: TestResult[];

  // Virtual fields
  get is_urgent(): boolean {
    return this.urgency === TestUrgency.STAT || this.urgency === TestUrgency.EMERGENCY;
  }

  get is_completed(): boolean {
    return this.status === TestOrderStatus.COMPLETED || 
           this.status === TestOrderStatus.REVIEWED;
  }

  get is_cancelled(): boolean {
    return this.status === TestOrderStatus.CANCELLED;
  }

  get estimated_completion(): Date | null {
    if (!this.lab_test?.turnaround_time_hours) return null;
    
    const baseTime = this.specimen_collected_at || this.createdAt;
    const completion = new Date(baseTime);
    completion.setHours(completion.getHours() + this.lab_test.turnaround_time_hours);
    
    // Adjust for urgency
    if (this.urgency === TestUrgency.STAT) {
      completion.setHours(completion.getHours() - this.lab_test.turnaround_time_hours * 0.75);
    } else if (this.urgency === TestUrgency.EMERGENCY) {
      completion.setHours(completion.getHours() - this.lab_test.turnaround_time_hours * 0.5);
    }
    
    return completion;
  }

  get time_since_ordered(): number {
    return Date.now() - this.createdAt.getTime();
  }

  get is_overdue(): boolean {
    if (!this.estimated_completion || this.is_completed) return false;
    return new Date() > this.estimated_completion;
  }

  // Instance methods
  async collectSpecimen(collectorId: string, quality: 'good' | 'fair' | 'poor', notes?: string): Promise<void> {
    if (this.status !== TestOrderStatus.ORDERED) {
      throw new Error('Can only collect specimen for ordered tests');
    }

    this.specimen_collected_at = new Date();
    this.collected_by = collectorId;
    this.specimen_quality = quality;
    this.collection_notes = notes;
    this.status = TestOrderStatus.SPECIMEN_COLLECTED;

    await this.save();
  }

  async startProcessing(): Promise<void> {
    if (this.status !== TestOrderStatus.SPECIMEN_COLLECTED) {
      throw new Error('Specimen must be collected before processing');
    }

    this.status = TestOrderStatus.PROCESSING;
    await this.save();
  }

  async completeTest(results: any[], technicianNotes?: string): Promise<void> {
    if (this.status !== TestOrderStatus.PROCESSING) {
      throw new Error('Test must be in processing status to complete');
    }

    this.status = TestOrderStatus.COMPLETED;
    this.results_available_at = new Date();
    this.technician_notes = technicianNotes;

    await this.save();
  }

  async review(reviewerId: string): Promise<void> {
    if (this.status !== TestOrderStatus.COMPLETED && this.status !== TestOrderStatus.PENDING_REVIEW) {
      throw new Error('Test must be completed before review');
    }

    this.status = TestOrderStatus.REVIEWED;
    this.reviewed_by = reviewerId;
    this.reviewed_at = new Date();

    await this.save();
  }

  async cancel(reason?: string): Promise<void> {
    if (this.is_completed) {
      throw new Error('Cannot cancel completed test');
    }

    this.status = TestOrderStatus.CANCELLED;
    this.rejection_reason = reason;

    await this.save();
  }

  // Static methods
  static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastOrder = await this.findOne({
      where: {
        order_number: {
          [Op.like]: `LAB${dateStr}%`
        }
      },
      order: [['order_number', 'DESC']]
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.slice(-4));
      sequence = lastSequence + 1;
    }

    return `LAB${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  static async getOverdueOrders(): Promise<TestOrder[]> {
    return this.findAll({
      include: [{ model: LabTest }],
      where: {
        status: {
          [Op.notIn]: [TestOrderStatus.COMPLETED, TestOrderStatus.REVIEWED, TestOrderStatus.CANCELLED]
        }
      }
    });
  }

  // Hooks
  @BeforeCreate
  static async setOrderNumber(instance: TestOrder) {
    if (!instance.order_number) {
      instance.order_number = await TestOrder.generateOrderNumber();
    }
  }

  @BeforeUpdate
  static async validateStatusTransition(instance: TestOrder) {
    if (instance.changed('status')) {
      const previousStatus = (instance as any)._previousDataValues.status as TestOrderStatus;
      const newStatus = instance.status;

      // Define valid status transitions
      const validTransitions: Record<TestOrderStatus, TestOrderStatus[]> = {
        [TestOrderStatus.ORDERED]: [TestOrderStatus.SPECIMEN_COLLECTED, TestOrderStatus.CANCELLED],
        [TestOrderStatus.SPECIMEN_COLLECTED]: [TestOrderStatus.PROCESSING, TestOrderStatus.CANCELLED],
        [TestOrderStatus.PROCESSING]: [TestOrderStatus.COMPLETED, TestOrderStatus.PENDING_REVIEW, TestOrderStatus.CANCELLED],
        [TestOrderStatus.COMPLETED]: [TestOrderStatus.REVIEWED, TestOrderStatus.PENDING_REVIEW],
        [TestOrderStatus.PENDING_REVIEW]: [TestOrderStatus.REVIEWED],
        [TestOrderStatus.REVIEWED]: [],
        [TestOrderStatus.CANCELLED]: [],
        [TestOrderStatus.CRITICAL_ALERT]: [TestOrderStatus.REVIEWED]
      };

      if (!validTransitions[previousStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
      }
    }
  }
}