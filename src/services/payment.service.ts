import { 
  PaymentInitiationData, 
  PaymentVerificationData, 
  PaymentResponse,
  PaymentRequestData,
  AllPaymentsResponse,
  FetchPaymentsRequestData
} from '../types/payment.types';
import { getFromRedis, saveToRedis } from '../core/redis';
import { Payment } from '../models/payment.model';
import { Patient } from '../models/patient.model';
import { Appointment } from '../models/appointment.model';
import { User } from '../models/user.model';

// Define enums locally since they may not exist in models
enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  USSD = 'ussd',
  MOBILE_MONEY = 'mobile_money'
}
import paymentProcessorFactory from './payment/payment-processor.factory';
import { ValidationUtil } from '../utils/validation.util';

export const paymentService = {
  initiatePayment: async (paymentData: PaymentRequestData): Promise<PaymentResponse> => {
    try {
      // Validate request data
      const { amount, email, currency, payment_provider, payment_method } = paymentData;
      
      if (!amount || !email || !payment_provider || !payment_method) {
        const error = new Error('Invalid payment data');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (amount < 100) {
        const error = new Error('Amount must be at least 100');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (!ValidationUtil.isValidEmail(email)) {
        const error = new Error('Invalid email format');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (!['stripe', 'paystack', 'flutterwave'].includes(payment_provider)) {
        const error = new Error('Invalid payment provider');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (!Object.values(PaymentMethod).includes(payment_method as PaymentMethod)) {
        const error = new Error('Invalid payment method');
        error.name = 'ValidationError';
        throw error;
      }

      // Find user by email
      const user = await User.findOne({
        where: { email },
        attributes: { include: ['id'] },
        include: [
          {
            model: Patient,
            as: "patient",
            attributes: {
              exclude: ["created_at", "updated_at", "deleted_at"]
            }
          }
        ]
      });

      if (!user) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'Patient not found',
          data: null
        };
      }
      
      // Find pending appointment for patient
      const appointment = await Appointment.findOne({
        where: {
          patient_id: user?.dataValues.patient.id,
          status: 'pending'
        },
        order: [['createdAt', 'DESC']]
      });
  
      if (!appointment) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'No pending appointment found',
          data: null
        };
      }
  
      // Initialize payment with selected provider
      const paymentResult = await paymentProcessorFactory.initiatePayment(paymentData);
      
      if (paymentResult.statusCode !== 200) {
        return paymentResult;
      }

      // Save payment record
      await Payment.create({
        amount: amount,
        email: email,
        reference: paymentResult.data.reference,
        payment_processor: payment_provider,
        payment_method: payment_method,
        currency: currency || 'NGN',
        patient_id: user?.dataValues.patient.id,
        payment_date: new Date(),
        payment_status: PaymentStatus.PENDING,
        appointment_id: appointment.id,
        created_by: user.id
      });

      // Cache payment data
      const cacheKey = `payment:initiate:${email}:${paymentResult.data.reference}`;
      await saveToRedis(cacheKey, JSON.stringify(paymentResult), 1800); // 30 minutes cache
      
      return paymentResult;
    } catch (error) {
      console.error('Payment initiation error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Payment initiation failed',
        data: null
      };
    }
  },

  verifyPayment: async (verificationData: PaymentVerificationData): Promise<PaymentResponse> => {
    try {
      const { reference } = verificationData;
      
      if (!reference) {
        throw new Error('Reference is required');
      }
      
      // Find payment record
      const payment = await Payment.findOne({
        where: { reference }
      });
      
      if (!payment) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'Payment record not found',
          data: null
        };
      }
      
      // Check if already verified
      if (payment.payment_status === PaymentStatus.COMPLETED) {
        return {
          statusCode: 200,
          status: 'success',
          message: 'Payment already verified',
          data: payment
        };
      }
      
      // Verify with appropriate payment processor
      const verificationResult = await paymentProcessorFactory.verifyPayment(
        reference, 
        payment.payment_processor || 'paystack'
      );
      
      if (verificationResult.statusCode === 200 && verificationResult.status === 'success') {
        // Update payment record
        await payment.update({
          payment_status: PaymentStatus.COMPLETED,
          processor_response: verificationResult.data,
          processed_at: new Date()
        });
        
        // Update appointment status
        if ((payment as any).appointment_id) {
          await Appointment.update(
            { status: 'scheduled' },
            { where: { id: (payment as any).appointment_id } }
          );
        }
        
        // Cache verification result
        const cacheKey = `payment:verify:${reference}`;
        await saveToRedis(cacheKey, JSON.stringify(verificationResult), 3600); // 1 hour cache
      }
      
      return verificationResult;
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Payment verification failed',
        data: null
      };
    }
  },

  getAllPayments: async (fetchParams: FetchPaymentsRequestData): Promise<AllPaymentsResponse> => {
    try {
      let { pageNumber, limitNumber } = fetchParams;
      
      if (typeof pageNumber !== 'number' || pageNumber < 1) pageNumber = 1;
      if (typeof limitNumber !== 'number' || limitNumber < 1) limitNumber = 10;
      
      const offset = (pageNumber - 1) * limitNumber;

      const payments = await Payment.findAll({
        where: { deleted_at: null }, // Filter out soft-deleted payments
        offset,
        limit: limitNumber,
        order: [['created_at', 'DESC']]
      });
      
      if (!payments || payments.length === 0) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'No payments found',
          data: null
        };
      }
      
      return {
        statusCode: 200,
        status: 'success',
        message: 'Payments retrieved successfully',
        data: payments
      };
    } catch (error) {
      console.error('Error retrieving payments:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to retrieve payments',
        data: null
      };
    }
  },
  
  getPaymentById: async (paymentId: string): Promise<AllPaymentsResponse> => {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }
      
      const payment = await Payment.findByPk(paymentId);
      
      if (!payment) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'Payment not found',
          data: null
        };
      }
      
      return {
        statusCode: 200,
        status: 'success',
        message: 'Payment retrieved successfully',
        data: payment 
      };
    } catch (error) {
      console.error('Error retrieving payment:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to retrieve payment',
        data: null
      };
    }
  },
  
  getPaymentByReference: async (reference: string): Promise<AllPaymentsResponse> => {
    try {
      if (!reference) {
        throw new Error('Reference is required');
      }
      
      const payment = await Payment.findOne({
        where: { reference }
      });
      
      if (!payment) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'Payment not found',
          data: null
        };
      }
      
      return {
        statusCode: 200,
        status: 'success',
        message: 'Payment retrieved successfully',
        data: payment 
      };
    } catch (error) {
      console.error('Error retrieving payment by reference:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to retrieve payment',
        data: null
      };
    }
  },

  processRefund: async (paymentId: string, amount?: number, reason?: string): Promise<PaymentResponse> => {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      // Validate refund amount if provided
      if (amount !== undefined && amount < 1) {
        const error = new Error('Refund amount must be at least 1');
        error.name = 'ValidationError';
        throw error;
      }
      
      const payment = await Payment.findByPk(paymentId);
      
      if (!payment) {
        return {
          statusCode: 404,
          status: 'error',
          message: 'Payment not found',
          data: null
        };
      }

      if (payment.payment_status !== PaymentStatus.COMPLETED) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Only completed payments can be refunded',
          data: null
        };
      }

      // Process refund with appropriate payment processor
      const refundResult = await paymentProcessorFactory.createRefund(
        (payment as any).reference || (payment as any).reference_number || (payment as any).transaction_id || '', 
        (payment as any).payment_processor || 'paystack',
        amount
      );

      if (refundResult.statusCode === 200 && refundResult.status === 'success') {
        // Update payment record
        await payment.processRefund(amount, reason);
      }

      return refundResult;
    } catch (error) {
      console.error('Payment refund error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Refund processing failed',
        data: null
      };
    }
  },

  handleWebhookEvent: async (signature: string, body: string | Buffer, provider: string): Promise<PaymentResponse> => {
    try {
      if (!signature) {
        throw new Error('Missing signature');
      }
      
      return await paymentProcessorFactory.handleWebhookEvent(signature, body, provider);
    } catch (error) {
      console.error('Webhook handling error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to process webhook',
        data: null
      };
    }
  }
};