import { Router } from 'express';
import { validate } from '../middleware/validation.middleware';
import paymentController from '../controllers/payment.controller';
import { paymentService } from '../services/payment.service';

const router = Router();

/**
 * Example of using the validation middleware
 * The validation function is defined in the service layer
 * This keeps controllers focused only on handling requests and responses
 */

// Payment routes with validation middleware
router.post(
  '/initiate', 
  validate((data) => {
    const { amount, email, payment_provider, payment_method } = data;
    
    // Simple validation example - in practice you'd call a service validation method
    if (!amount || !email || !payment_provider || !payment_method) {
      const error = new Error('Required payment fields missing');
      error.name = 'ValidationError';
      throw error;
    }
    
    return true;
  }),
  paymentController.initiatePayment
);

// A more practical approach would be to use service validation methods
router.post(
  '/refund/:paymentId',
  validate(async (data) => {
    const { paymentId, amount, reason } = data;
    
    // This is a hypothetical validation method that would be implemented in the service
    // In a real implementation, you'd create validation methods in the service
    if (!paymentId) {
      const error = new Error('Payment ID is required');
      error.name = 'ValidationError';
      throw error;
    }
    
    if (amount && amount < 1) {
      const error = new Error('Refund amount must be at least 1');
      error.name = 'ValidationError';
      throw error;
    }
    
    return true;
  }),
  paymentController.processRefund
);

export default router;