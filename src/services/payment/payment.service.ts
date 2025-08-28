import axios from 'axios';
import { 
  PaymentInitiationData, 
  PaymentVerificationData, 
  PaymentResponse,
  PaymentRequestData,
  AllPaymentsResponse,
  FetchPaymentsRequestData
} from '../types/payment.types';
import { getFromRedis, saveToRedis } from '../../core/redis';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from './payment.model';
import { Patient } from '../patient/patient.model';
import { Appointment } from '../appointment/appointment.model';
import { User } from '../user/user.model';

export const paymentService = {
  initiatePayment: async (paymentData: PaymentRequestData): Promise<PaymentResponse> => {
    try {
      const { amount, email, currency, payment_provider, payment_method } = paymentData;
      
      if (!paymentData || !paymentData.amount || !paymentData.email || !paymentData.currency || !paymentData.payment_provider || !paymentData.payment_method) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Invalid payment data',
          data: null
        };
      }
      
      if (amount < 100) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Amount must be greater than 100',
          data: null
        }
      }
      const user = await User.findOne({
        where: {
          email: email
        },
        attributes:{
          include: ['id']
        },
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
  
      const paymentInitData: PaymentInitiationData = {
        amount: amount,
        email: email,
        currency: currency,
        paymentProvider: payment_provider || 'paystack',
        paymentMethod: payment_method,
        patient_id: user?.dataValues.patient.id,
        appointment_id: appointment.id
      };
  
      const cacheKey = `payment:initiate:${paymentInitData.email}`;
      const generateReference = uuidv4();
      const paystackCallback_url = `${process.env.PAYSTACK_CALLBACK_URL}`;
      const koraPayCallback_url = `${process.env.KORAPAY_CALLBACK_URL}`;

      const params = {
        amount: amount * 100, // Convert to kobo
        email: email,
        currency: currency || 'NGN',
        reference: generateReference,
        
      };
      // if (payment_provider === 'paystack') {
        
      // }

        if (payment_provider === 'korapay') {
          const apiSecret = 'process.env.KORA_SECRET_KEY';
          const config = {
            headers: {
              'Authorization': `Bearer ${process.env.KORA_PUBLIC_KEY}`,
              'Content-Type': 'application/json',
            },
          };
          
          const requestBody = {
            amount: paymentData.amount,
            currency: paymentData.currency || 'NGN',
            payment_method: paymentData.payment_method,
            email: paymentData.email,
            metadata: {
              custom_data: user.first_name,
            },
            // success_url: 'https://example.com/success',
            // cancel_url: 'https://example.com/cancel',
          };
          
          axios.post('https://api.korapay.com/checkout/v1/sessions', requestBody, config)
          .then((response) => {
              const checkoutSessionId = response.data.id;
              const checkoutUrl = `https://checkout.korapay.com/${checkoutSessionId}`;
              console.log(`Redirect to: ${checkoutUrl}`);
            })
          .catch((error) => {
              console.error(error);
            });
        }

      const config = { headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }};
      const response = await axios.post(paystackCallback_url, params, config);
      if (!response || response.status !== 200) {
        return {
          statusCode: 400,
          status: 'failure',
          message: 'Payment not initiated',
          data: null
        }
      }
      
      const paymentResponse = {
        data: {
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
          reference: response.data.data.reference
        }
      };
      // console.log(paymentResponse);
      
      const createPayment = await Payment.create({
        amount: paymentData.amount,
        email: paymentData.email,
        reference: response.data.data.reference,
        payment_provider: 'paystack',
        currency: paymentData.currency || 'NGN',
        patient_id: user?.dataValues.patient.id,  // Use the patient_id from payment data
        payment_method: paymentData.payment_method,
        payment_date: new Date(),
        payment_status: 'pending',
        appointment_id: appointment.id
      });
      if (createPayment) {
        console.log('Payment created successfully');
  
      }
  
      await saveToRedis(cacheKey, JSON.stringify(paymentResponse), 1800); // 30 minutes cache
      return {
        statusCode: 200,
        status: 'success',
        message: 'Payment initiated successfully',
        data: {
          authorization_url: response.data.data.authorization_url,
          // access_code: response.data.data.access_code,
          reference: response.data.data.reference
        }
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  },
  verifyPayment: async (verificationData: PaymentVerificationData): Promise<PaymentResponse> => {
    try {
      const cacheKey = `payment:verify:${verificationData.reference}`;
      
      // const cachedVerification = await getFromRedis(cacheKey);
      // if (cachedVerification) {
      //   return JSON.parse(cachedVerification);
      // }
  
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${verificationData.reference}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      });
      if (response.status !== 200) {
        return {
          statusCode: 400,
          status: 'failure',
          message: 'Payment verification failed',
          data: null
        };
      }

      const verificationResponse = {
        statusCode: 200,
        status: 'success',
        message: 'Payment verified successfully',
        data: response.data
      };
  
      await saveToRedis(cacheKey, JSON.stringify(verificationResponse), 3600);
      await Payment.update(
        { 
          payment_status: 'completed',
          payment_data: response.data
        },
        { where: { 
          reference: verificationData.reference
        }}
      );

      // await Appointment.update(
      //   { 
      //     status: 'scheduled',
      //   },
      //   { where: { 
      //     reference: verificationData.reference 
      //   }},
      // )
      
      return verificationResponse;
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to verify payment',
        data: null
      };
    }
  },
  getAllPayments: async (fetchPayments: FetchPaymentsRequestData): Promise<AllPaymentsResponse> => {
    try {
      let { pageNumber, limitNumber } = fetchPayments;
    if (typeof pageNumber !== 'number' || pageNumber < 1) pageNumber = 1;
    if (typeof limitNumber !== 'number' || limitNumber < 1) limitNumber = 10;
    const offset = (pageNumber - 1) * limitNumber;

    const payments = await Payment.findAll({
      where: { deleted_at: null }, // explicit filter for soft-deleted payments
      offset,
      limit: limitNumber,
      order: [['createdAt', 'DESC']]
    });
    if (!payments || payments.length === 0) {
      return {
        statusCode: 404,
        status:'error',
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
      throw error;
    }
  },
  getPaymentById: async (paymentId: string): Promise<AllPaymentsResponse> => {
    try {
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
      }
    }
    catch (error) {
      console.log(error);
      throw error;
    }
  },
  getPaymentByReference: async (reference: string): Promise<AllPaymentsResponse> => {
    try {
      const payment = await Payment.findOne({
        where: {
          reference: reference
        }
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
      }
    }
    catch (error) {
      console.log(error);
      throw error;
    }
  }
}
