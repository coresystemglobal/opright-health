import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import { laboratoryController } from './laboratory.controller';
import { validate, validateParams, validateQuery, laboratoryValidation, genericValidation } from '@utils/validator';

const laboratoryRouter = express.Router();

// ===============================================
// LAB TEST CATALOG ROUTES
// ===============================================

// Get all lab tests with optional filtering
laboratoryRouter.get("/tests", 
  validateQuery(laboratoryValidation.searchTests),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getAllTests(req, res);
  }
);

// Get lab test by ID
laboratoryRouter.get("/tests/:testId", 
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestById(req, res);
  }
);

// Get lab test by test code
laboratoryRouter.get("/tests/code/:testCode", 
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestByCode(req, res);
  }
);

// Get tests by category
laboratoryRouter.get("/tests/category/:category", 
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestsByCategory(req, res);
  }
);

// Create a new lab test (Admin only)
laboratoryRouter.post("/tests", 
  validate(laboratoryValidation.createTest),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createLabTest(req, res);
  }
);

// Update a lab test (Admin only)
laboratoryRouter.put("/tests/:testId", 
  validateParams(genericValidation.id),
  validate(laboratoryValidation.updateTest),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.updateLabTest(req, res);
  }
);

// Deactivate a lab test (Admin only)
laboratoryRouter.patch("/tests/:testId/deactivate", 
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.deactivateLabTest(req, res);
  }
);

// ===============================================
// TEST ORDER ROUTES
// ===============================================

// Create a test order
laboratoryRouter.post("/orders", 
  validate(laboratoryValidation.createOrder),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createTestOrder(req, res);
  }
);

// Get test order by ID
laboratoryRouter.get("/orders/:orderId", 
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestOrder(req, res);
  }
);

// Get test orders for a patient
laboratoryRouter.get("/orders/patient/:patientId", 
  validateParams(genericValidation.id),
  validateQuery(laboratoryValidation.searchOrders),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getPatientTestOrders(req, res);
  }
);

// Get test orders for a doctor
laboratoryRouter.get("/orders/doctor/:doctorId", 
  validateParams(genericValidation.id),
  validateQuery(laboratoryValidation.searchOrders),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getDoctorTestOrders(req, res);
  }
);

// Get pending test orders
laboratoryRouter.get("/orders/status/pending", 
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getPendingOrders(req, res);
  }
);

// Get overdue test orders
laboratoryRouter.get("/orders/status/overdue", 
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getOverdueOrders(req, res);
  }
);

// Cancel a test order
laboratoryRouter.patch("/orders/:orderId/cancel", 
  validateParams(genericValidation.id),
  validate(laboratoryValidation.cancelOrder),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.cancelTestOrder(req, res);
  }
);

// ===============================================
// SPECIMEN COLLECTION ROUTES
// ===============================================

// Collect specimen for a test order
laboratoryRouter.patch("/orders/:orderId/collect", 
  validateParams(genericValidation.id),
  validate(laboratoryValidation.collectSpecimen),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.collectSpecimen(req, res);
  }
);

// Start processing a test order
laboratoryRouter.patch("/orders/:orderId/process", 
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.startProcessing(req, res);
  }
);

// ===============================================
// RESULTS MANAGEMENT ROUTES
// ===============================================

// Add test results to an order
laboratoryRouter.post("/orders/:orderId/results", 
  validateParams(genericValidation.id),
  validate(laboratoryValidation.addResults),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.addTestResults(req, res);
  }
);

// Get test results for an order
laboratoryRouter.get("/orders/:orderId/results", 
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestResults(req, res);
  }
);

// Review test results
laboratoryRouter.patch("/orders/:orderId/review", 
  validateParams(genericValidation.id),
  validate(laboratoryValidation.reviewResults),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.reviewTestResults(req, res);
  }
);

// Get critical test results (Alert system)
laboratoryRouter.get("/results/critical", 
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getCriticalResults(req, res);
  }
);

// ===============================================
// REPORTING ROUTES
// ===============================================

// Generate lab report for a patient
laboratoryRouter.post("/reports/patient/:patientId", 
  validateParams(genericValidation.id),
  validate(laboratoryValidation.generateReport),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.generateLabReport(req, res);
  }
);

// Get laboratory statistics
laboratoryRouter.get("/statistics", 
  validateQuery(laboratoryValidation.statisticsQuery),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getLabStatistics(req, res);
  }
);

// Get workload information
laboratoryRouter.get("/workload", 
  validateQuery(laboratoryValidation.workloadQuery),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getWorkload(req, res);
  }
);

// ===============================================
// SPECIALIZED ENDPOINTS
// ===============================================

// Get test catalog for specific department
laboratoryRouter.get("/catalog/department/:department", 
  async (req: ExpressRequest, res: Response) => {
    const { department } = req.params;
    req.query.department = department;
    await laboratoryController.getAllTests(req, res);
  }
);

// Bulk test order creation (for health screening packages)
laboratoryRouter.post("/orders/bulk", 
  validate(laboratoryValidation.createOrder),
  async (req: ExpressRequest, res: Response) => {
    // Implementation for bulk orders
    // This could create multiple test orders at once
    await laboratoryController.createTestOrder(req, res);
  }
);

// Quality control endpoints (for future enhancement)
laboratoryRouter.get("/quality-control/summary", 
  async (req: ExpressRequest, res: Response) => {
    // Placeholder for quality control summary
    res.json({ message: "Quality control endpoint - to be implemented in Phase 2" });
  }
);

// Equipment management endpoints (for future enhancement)
laboratoryRouter.get("/equipment/status", 
  async (req: ExpressRequest, res: Response) => {
    // Placeholder for equipment status
    res.json({ message: "Equipment status endpoint - to be implemented in Phase 2" });
  }
);

export default laboratoryRouter;