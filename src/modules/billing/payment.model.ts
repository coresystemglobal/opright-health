import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  Index,
  BeforeCreate
} from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Invoice } from '@modules/billing/invoice.model';

import { User } from '@modules/users/user.model';
import { Tenant } from '@modules/tenancy/tenant.model';


export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  INSURANCE = 'insurance',
  CHECK = 'check',
  ONLINE = 'online',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

@Table({
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['invoice_id']
    },
    {
      fields: ['payment_method']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['payment_date']
    },
    {
      fields: ['transaction_id']
    },
    {
      fields: ['created_by']
    }
  ]
})
export class Payment extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  // Owning tenant (nullable so legacy rows survive; new rows are tenant-scoped).
  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  tenant_id?: string;

  @BelongsTo(() => Tenant)
  tenant?: Tenant;

  @ForeignKey(() => Invoice)
  @Column({
    type: DataType.UUID,
    allowNull: true   // nullable — some payments are initiated before invoice is created
  })
  invoice_id?: string;

  @BelongsTo(() => Invoice)
  invoice?: Invoice;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  })
  amount!: number;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentMethod)),
    allowNull: false
  })
  payment_method!: PaymentMethod;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
    defaultValue: PaymentStatus.PENDING
  })
  payment_status!: PaymentStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  payment_date!: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true
  })
  transaction_id?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  payment_processor?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  processor_response?: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true
  })
  reference_number?: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: 'NGN'
  })
  currency!: string;

  @Column({
    type: DataType.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
  })
  processing_fee_rate!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  })
  processing_fee_amount!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  })
  net_amount?: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  created_by!: string;

  @BelongsTo(() => User)
  creator?: User;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  processed_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  failed_at?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  failure_reason?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  refunded_at?: Date;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  })
  refund_amount?: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  refund_reason?: string;

  // Card payment specific fields (encrypted/masked)
  @Column({
    type: DataType.STRING(4),
    allowNull: true
  })
  card_last_four?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  card_brand?: string;

  @Column({
    type: DataType.STRING(7), // MM/YYYY
    allowNull: true
  })
  card_expiry?: string;

  // Bank transfer specific fields
  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  bank_name?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  account_number_masked?: string;

  // Insurance specific fields
  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  insurance_provider?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  policy_number?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  authorization_code?: string;

  // Timestamp fields (provided by Sequelize with underscored: true)
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  // Virtual fields
  get is_successful(): boolean {
    return this.payment_status === PaymentStatus.COMPLETED;
  }

  get is_pending(): boolean {
    return this.payment_status === PaymentStatus.PENDING || 
           this.payment_status === PaymentStatus.PROCESSING;
  }

  get is_failed(): boolean {
    return this.payment_status === PaymentStatus.FAILED || 
           this.payment_status === PaymentStatus.CANCELLED;
  }

  get is_refunded(): boolean {
    return this.payment_status === PaymentStatus.REFUNDED;
  }

  get effective_amount(): number {
    const amount = parseFloat(this.amount.toString());
    const processingFee = parseFloat(this.processing_fee_amount.toString());
    return amount - processingFee;
  }

  // Instance methods
  calculateProcessingFee(): void {
    const amount = parseFloat(this.amount.toString());
    const rate = parseFloat(this.processing_fee_rate.toString());
    
    this.processing_fee_amount = amount * rate;
    this.net_amount = amount - this.processing_fee_amount;
  }

  async markAsCompleted(transactionId?: string, processorResponse?: any): Promise<void> {
    this.payment_status = PaymentStatus.COMPLETED;
    this.processed_at = new Date();
    
    if (transactionId) {
      this.transaction_id = transactionId;
    }
    
    if (processorResponse) {
      this.processor_response = processorResponse;
    }
    
    await this.save();
    
    // Update invoice payment status
    if (this.invoice) {
      await this.invoice.addPayment(parseFloat(this.amount.toString()));
    }
  }

  async markAsFailed(reason: string): Promise<void> {
    this.payment_status = PaymentStatus.FAILED;
    this.failed_at = new Date();
    this.failure_reason = reason;
    
    await this.save();
  }

  async processRefund(amount?: number, reason?: string): Promise<void> {
    if (this.payment_status !== PaymentStatus.COMPLETED) {
      throw new Error('Only completed payments can be refunded');
    }

    const refundAmount = amount || parseFloat(this.amount.toString());
    const paidAmount = parseFloat(this.amount.toString());

    if (refundAmount > paidAmount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    this.payment_status = PaymentStatus.REFUNDED;
    this.refunded_at = new Date();
    this.refund_amount = refundAmount;
    this.refund_reason = reason;

    await this.save();

    // Update invoice if partial refund
    if (this.invoice && refundAmount < paidAmount) {
      await this.invoice.refund(refundAmount);
    }
  }

  // Get masked payment details for display
  getDisplayDetails(): any {
    const details: any = {
      method: this.payment_method,
      amount: this.amount,
      status: this.payment_status,
      date: this.payment_date
    };

    switch (this.payment_method) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        details.card = {
          lastFour: this.card_last_four,
          brand: this.card_brand,
          expiry: this.card_expiry
        };
        break;
      
      case PaymentMethod.BANK_TRANSFER:
        details.bank = {
          name: this.bank_name,
          account: this.account_number_masked
        };
        break;
      
      case PaymentMethod.INSURANCE:
        details.insurance = {
          provider: this.insurance_provider,
          policy: this.policy_number,
          authorization: this.authorization_code
        };
        break;
    }

    return details;
  }

  // Static methods
  static async getTotalByMethod(startDate: Date, endDate: Date): Promise<any> {
    const results = await Payment.findAll({
      attributes: [
        'payment_method',
        [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'total'],
        [Payment.sequelize!.fn('COUNT', Payment.sequelize!.col('id')), 'count']
      ],
      where: {
        payment_status: PaymentStatus.COMPLETED,
        payment_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['payment_method'],
      raw: true
    });

    return results;
  }

  @BeforeCreate
  static async calculateFees(instance: Payment) {
    // Calculate processing fees based on payment method
    instance.calculateProcessingFee();

    // Generate reference number if not provided
    if (!instance.reference_number) {
      const timestamp = Date.now().toString();
      instance.reference_number = `PAY-${timestamp}`;
    }
  }
}