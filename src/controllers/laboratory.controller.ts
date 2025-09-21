import { Request as ExpressRequest, Response } from 'express';
import { LaboratoryService } from '../services/laboratory.service';
import { ResponseUtil } from '../utils/response.util';
import { PaginationQuery, AuthenticatedRequest } from '../types/common.types';
import { 
  TestCategory, 
  TestUrgency, 
  TestOrderStatus,
  CreateTestOrderRequest,
  SpecimenCollection 
} from '../types/laboratory.types';

/**
 * Laboratory controller for handling lab test operations
 */
const laboratoryController = {
  /**
   * Get all available lab tests with optional filtering
   */
  getAllTests: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { 
        category, 
        department, 
        is_active = 'true', 
        search,
        page = '1', 
        limit = '20' 
      } = req.query;
      
      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        category: category as TestCategory,
        department: department as string,
        isActive: is_active === 'true',
        search: search as string
      };

      const result = await LaboratoryService.getAllTests(options);

      return ResponseUtil.success(res, {
        tests: result.tests,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
          hasNextPage: parseInt(page as string) * parseInt(limit as string) < result.total,
          hasPrevPage: parseInt(page as string) > 1
        }
      }, 'Lab tests retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve lab tests', 500, [errorMessage]);
    }
  },

  /**
   * Get lab test by ID
   */
  getTestById: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { testId } = req.params;

      if (!testId) {
        return ResponseUtil.validationError(res, ['Test ID is required']);
      }

      const test = await LaboratoryService.getTestById(testId);
      
      if (!test) {
        return ResponseUtil.notFound(res, 'Lab test not found');
      }

      return ResponseUtil.success(res, test, 'Lab test retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve lab test', 500, [errorMessage]);
    }
  },

  /**
   * Get lab test by test code
   */
  getTestByCode: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { testCode } = req.params;

      if (!testCode) {
        return ResponseUtil.validationError(res, ['Test code is required']);
      }

      const test = await LaboratoryService.getTestByCode(testCode);
      
      if (!test) {
        return ResponseUtil.notFound(res, 'Lab test not found');
      }

      return ResponseUtil.success(res, test, 'Lab test retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve lab test', 500, [errorMessage]);
    }
  },

  /**
   * Get tests by category
   */
  getTestsByCategory: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { category } = req.params;

      if (!category || !Object.values(TestCategory).includes(category as TestCategory)) {
        return ResponseUtil.validationError(res, ['Valid test category is required']);
      }

      const tests = await LaboratoryService.getTestsByCategory(category as TestCategory);

      return ResponseUtil.success(res, tests, 'Tests retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve tests by category', 500, [errorMessage]);
    }
  },

  /**
   * Create a new lab test
   */
  createLabTest: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const testData = req.body;
      
      if (!testData.test_code || !testData.test_name || !testData.category || 
          !testData.specimen_type || !testData.price) {
        return ResponseUtil.validationError(res, [
          'Test code, test name, category, specimen type, and price are required'
        ]);
      }

      const test = await LaboratoryService.createLabTest(testData);
      
      return ResponseUtil.success(res, test, 'Lab test created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
        return ResponseUtil.validationError(res, ['Test code already exists']);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to create lab test', 500, [errorMessage]);
    }
  },

  /**
   * Update a lab test
   */
  updateLabTest: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { testId } = req.params;
      const updateData = req.body;

      if (!testId) {
        return ResponseUtil.validationError(res, ['Test ID is required']);
      }

      const test = await LaboratoryService.updateLabTest(testId, updateData);
      
      if (!test) {
        return ResponseUtil.notFound(res, 'Lab test not found');
      }

      return ResponseUtil.success(res, test, 'Lab test updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to update lab test', 500, [errorMessage]);
    }
  },

  /**
   * Deactivate a lab test
   */
  deactivateLabTest: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { testId } = req.params;

      if (!testId) {
        return ResponseUtil.validationError(res, ['Test ID is required']);
      }

      const success = await LaboratoryService.deactivateLabTest(testId);
      
      if (!success) {
        return ResponseUtil.notFound(res, 'Lab test not found');
      }

      return ResponseUtil.success(res, null, 'Lab test deactivated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to deactivate lab test', 500, [errorMessage]);
    }
  },

  /**
   * Create a test order
   */
  createTestOrder: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const orderData: CreateTestOrderRequest = req.body;
      
      if (!orderData.patient_id || !orderData.doctor_id || !orderData.test_ids || 
          orderData.test_ids.length === 0) {
        return ResponseUtil.validationError(res, [
          'Patient ID, doctor ID, and at least one test ID are required'
        ]);
      }

      const order = await LaboratoryService.createTestOrder(orderData);
      
      return ResponseUtil.success(res, order, 'Test order created successfully', 201);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('not found') || 
        error.message.includes('inactive')
      )) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to create test order', 500, [errorMessage]);
    }
  },

  /**
   * Get test order by ID
   */
  getTestOrder: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return ResponseUtil.validationError(res, ['Order ID is required']);
      }

      const order = await LaboratoryService.getTestOrder(orderId);
      
      if (!order) {
        return ResponseUtil.notFound(res, 'Test order not found');
      }

      return ResponseUtil.success(res, order, 'Test order retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve test order', 500, [errorMessage]);
    }
  },

  /**
   * Get test orders for a patient
   */
  getPatientTestOrders: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { 
        status, 
        start_date, 
        end_date,
        page = '1', 
        limit = '10' 
      } = req.query;

      if (!patientId) {
        return ResponseUtil.validationError(res, ['Patient ID is required']);
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        status: status as TestOrderStatus,
        dateRange: start_date && end_date ? {
          start: new Date(start_date as string),
          end: new Date(end_date as string)
        } : undefined
      };

      const result = await LaboratoryService.getTestOrdersByPatient(patientId, options);

      return ResponseUtil.success(res, {
        orders: result.orders,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      }, 'Patient test orders retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve patient test orders', 500, [errorMessage]);
    }
  },

  /**
   * Get test orders for a doctor
   */
  getDoctorTestOrders: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { doctorId } = req.params;
      const { 
        status, 
        urgency,
        page = '1', 
        limit = '10' 
      } = req.query;

      if (!doctorId) {
        return ResponseUtil.validationError(res, ['Doctor ID is required']);
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        status: status as TestOrderStatus,
        urgency: urgency as TestUrgency
      };

      const result = await LaboratoryService.getTestOrdersByDoctor(doctorId, options);

      return ResponseUtil.success(res, {
        orders: result.orders,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      }, 'Doctor test orders retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve doctor test orders', 500, [errorMessage]);
    }
  },

  /**
   * Get pending test orders
   */
  getPendingOrders: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const orders = await LaboratoryService.getPendingOrders();

      return ResponseUtil.success(res, orders, 'Pending test orders retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve pending orders', 500, [errorMessage]);
    }
  },

  /**
   * Get overdue test orders
   */
  getOverdueOrders: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const orders = await LaboratoryService.getOverdueOrders();

      return ResponseUtil.success(res, orders, 'Overdue test orders retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve overdue orders', 500, [errorMessage]);
    }
  },

  /**
   * Collect specimen for a test order
   */
  collectSpecimen: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;
      const collectionData: SpecimenCollection = {
        ...req.body,
        order_id: orderId,
        collected_by: req.user?.userId || req.body.collected_by
      };

      if (!orderId || !collectionData.specimen_quality) {
        return ResponseUtil.validationError(res, [
          'Order ID and specimen quality are required'
        ]);
      }

      const order = await LaboratoryService.collectSpecimen(orderId, collectionData);

      return ResponseUtil.success(res, order, 'Specimen collected successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseUtil.notFound(res, error.message);
      }
      
      if (error instanceof Error && error.message.includes('Can only collect')) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to collect specimen', 500, [errorMessage]);
    }
  },

  /**
   * Start processing a test order
   */
  startProcessing: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return ResponseUtil.validationError(res, ['Order ID is required']);
      }

      const order = await LaboratoryService.startProcessing(orderId);

      return ResponseUtil.success(res, order, 'Test processing started successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseUtil.notFound(res, error.message);
      }
      
      if (error instanceof Error && error.message.includes('must be collected')) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to start processing', 500, [errorMessage]);
    }
  },

  /**
   * Add test results
   */
  addTestResults: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;
      const { results, technician_notes } = req.body;
      const performedBy = req.user?.userId || req.body.performed_by;

      if (!orderId || !results || !Array.isArray(results) || results.length === 0) {
        return ResponseUtil.validationError(res, [
          'Order ID and results array are required'
        ]);
      }

      if (!performedBy) {
        return ResponseUtil.validationError(res, ['Performed by user ID is required']);
      }

      const testResults = await LaboratoryService.addTestResults(orderId, results, performedBy);

      return ResponseUtil.success(res, testResults, 'Test results added successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseUtil.notFound(res, error.message);
      }
      
      if (error instanceof Error && error.message.includes('must be in processing')) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to add test results', 500, [errorMessage]);
    }
  },

  /**
   * Get test results for an order
   */
  getTestResults: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return ResponseUtil.validationError(res, ['Order ID is required']);
      }

      const results = await LaboratoryService.getTestResults(orderId);

      return ResponseUtil.success(res, results, 'Test results retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve test results', 500, [errorMessage]);
    }
  },

  /**
   * Review test results
   */
  reviewTestResults: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;
      const reviewerId = req.user?.userId || req.body.reviewer_id;

      if (!orderId) {
        return ResponseUtil.validationError(res, ['Order ID is required']);
      }

      if (!reviewerId) {
        return ResponseUtil.validationError(res, ['Reviewer ID is required']);
      }

      const order = await LaboratoryService.reviewTestResults(orderId, reviewerId);

      return ResponseUtil.success(res, order, 'Test results reviewed successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseUtil.notFound(res, error.message);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to review test results', 500, [errorMessage]);
    }
  },

  /**
   * Cancel a test order
   */
  cancelTestOrder: async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      if (!orderId) {
        return ResponseUtil.validationError(res, ['Order ID is required']);
      }

      const order = await LaboratoryService.cancelTestOrder(orderId, reason);

      return ResponseUtil.success(res, order, 'Test order cancelled successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseUtil.notFound(res, error.message);
      }
      
      if (error instanceof Error && error.message.includes('Cannot cancel')) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to cancel test order', 500, [errorMessage]);
    }
  },

  /**
   * Get critical test results
   */
  getCriticalResults: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const results = await LaboratoryService.getCriticalResults();

      return ResponseUtil.success(res, results, 'Critical test results retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve critical results', 500, [errorMessage]);
    }
  },

  /**
   * Generate lab report for a patient
   */
  generateLabReport: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { start_date, end_date, test_categories, include_normal_results } = req.body;

      if (!patientId) {
        return ResponseUtil.validationError(res, ['Patient ID is required']);
      }

      const reportRequest = {
        patient_id: patientId,
        date_range: start_date && end_date ? {
          start_date,
          end_date
        } : undefined,
        test_categories,
        include_normal_results: include_normal_results === true
      };

      const report = await LaboratoryService.getLabReport(reportRequest);

      return ResponseUtil.success(res, report, 'Lab report generated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to generate lab report', 500, [errorMessage]);
    }
  },

  /**
   * Get laboratory statistics
   */
  getLabStatistics: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return ResponseUtil.validationError(res, ['Start date and end date are required']);
      }

      const dateRange = {
        start: new Date(start_date as string),
        end: new Date(end_date as string)
      };

      const statistics = await LaboratoryService.getLabStatistics(dateRange);

      return ResponseUtil.success(res, statistics, 'Laboratory statistics retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve laboratory statistics', 500, [errorMessage]);
    }
  },

  /**
   * Get workload information
   */
  getWorkload: async (req: ExpressRequest, res: Response): Promise<Response> => {
    try {
      const { start_date, end_date } = req.query;

      const dateRange = start_date && end_date ? {
        start: new Date(start_date as string),
        end: new Date(end_date as string)
      } : undefined;

      const workload = await LaboratoryService.getWorkload(dateRange);

      return ResponseUtil.success(res, workload, 'Workload information retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResponseUtil.error(res, 'Failed to retrieve workload information', 500, [errorMessage]);
    }
  }
};

export { laboratoryController };