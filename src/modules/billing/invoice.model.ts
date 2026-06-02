import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  BelongsTo,
  ForeignKey,
  HasMany,
  Index,
  BeforeCreate
} from 'sequelize-typescript';
import { Patient } from '@modules/patients/patient.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { Payment } from '@modules/billing/payment.model';


export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum InvoiceType {
  CONSULTATION = 'consultation',
  PROCEDURE = 'procedure',
  EMERGENCY = 'emergency',
  DIAGNOSTIC = 'diagnostic',
  PHARMACY = 'pharmacy',
  OTHER = 'other'
}

@Table({
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['invoice_number']
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['invoice_date']
    },
    {
      fields: ['due_date']
    }
  ]
})
export class Invoice extends Model {
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
  invoice_number!: string;

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

  @ForeignKey(() => Appointment)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  appointment_id?: string;

  @BelongsTo(() => Appointment)
  appointment?: Appointment;

  @Column({
    type: DataType.ENUM(...Object.values(InvoiceType)),
    allowNull: false,
    defaultValue: InvoiceType.CONSULTATION
  })
  invoice_type!: InvoiceType;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
  })
  tax_rate!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  })
  tax_amount!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  })
  discount_amount!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  total_amount!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  })
  paid_amount!: number;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
    defaultValue: PaymentStatus.PENDING
  })
  payment_status!: PaymentStatus;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  invoice_date!: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  due_date!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  paid_at?: Date;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  line_items?: InvoiceLineItem[];

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  billing_address?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  reference_number?: string;

  @HasMany(() => Payment)
  payments?: Payment[];

  // Virtual fields
  get outstanding_amount(): number {
    const total = parseFloat(this.total_amount.toString());
    const paid = parseFloat(this.paid_amount.toString());
    return Math.max(0, total - paid);
  }

  get is_overdue(): boolean {
    if (this.payment_status === PaymentStatus.PAID) return false;
    return new Date() > new Date(this.due_date);
  }

  get days_overdue(): number {
    if (!this.is_overdue) return 0;
    const today = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get payment_progress(): number {
    const total = parseFloat(this.total_amount.toString());
    const paid = parseFloat(this.paid_amount.toString());
    if (total === 0) return 0;
    return Math.min(100, (paid / total) * 100);
  }

  get is_fully_paid(): boolean {
    return this.payment_status === PaymentStatus.PAID;
  }

  get is_partially_paid(): boolean {
    return this.payment_status === PaymentStatus.PARTIAL;
  }

  // Instance methods
  calculateTotals(): void {
    const subtotal = parseFloat(this.subtotal.toString());
    const taxRate = parseFloat(this.tax_rate.toString());
    const discountAmount = parseFloat(this.discount_amount?.toString() || '0');
    
    this.tax_amount = subtotal * taxRate;
    this.total_amount = subtotal + this.tax_amount - discountAmount;
  }

  async addPayment(amount: number): Promise<void> {
    const currentPaid = parseFloat(this.paid_amount.toString());
    const newPaidAmount = currentPaid + amount;
    const totalAmount = parseFloat(this.total_amount.toString());

    this.paid_amount = newPaidAmount;

    if (newPaidAmount >= totalAmount) {
      this.payment_status = PaymentStatus.PAID;
      this.paid_at = new Date();
    } else if (newPaidAmount > 0) {
      this.payment_status = PaymentStatus.PARTIAL;
    }

    await this.save();
  }

  async markAsOverdue(): Promise<void> {
    if (this.is_overdue && this.payment_status !== PaymentStatus.PAID) {
      this.payment_status = PaymentStatus.OVERDUE;
      await this.save();
    }
  }

  async cancel(): Promise<void> {
    if (this.paid_amount > 0) {
      throw new Error('Cannot cancel invoice with payments');
    }
    
    this.payment_status = PaymentStatus.CANCELLED;
    await this.save();
  }

  async refund(amount?: number): Promise<void> {
    const refundAmount = amount || parseFloat(this.paid_amount.toString());
    
    if (refundAmount > parseFloat(this.paid_amount.toString())) {
      throw new Error('Refund amount cannot exceed paid amount');
    }

    this.paid_amount = parseFloat(this.paid_amount.toString()) - refundAmount;
    
    if (this.paid_amount <= 0) {
      this.payment_status = PaymentStatus.REFUNDED;
      this.paid_amount = 0;
    } else {
      this.payment_status = PaymentStatus.PARTIAL;
    }

    await this.save();
  }

  // Generate invoice items summary
  getItemsSummary(): string {
    if (!this.line_items || this.line_items.length === 0) {
      return this.description || 'Medical consultation';
    }

    return this.line_items
      .map(item => `${item.description} (${item.quantity}x $${item.unit_price})`)
      .join(', ');
  }

  // Static method to generate invoice number
  @BeforeCreate
  static async generateInvoiceNumber(instance: Invoice) {
    if (!instance.invoice_number) {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const timestamp = Date.now().toString().slice(-6);
      
      instance.invoice_number = `INV-${year}${month}-${timestamp}`;
    }

    // Set default due date if not provided (30 days from invoice date)
    if (!instance.due_date) {
      const dueDate = new Date(instance.invoice_date);
      dueDate.setDate(dueDate.getDate() + 30);
      instance.due_date = dueDate;
    }

    // Calculate totals
    instance.calculateTotals();
  }
}

// Interface for invoice line items
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  service_code?: string;
  category?: string;
}