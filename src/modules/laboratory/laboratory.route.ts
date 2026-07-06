import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import { laboratoryController } from './laboratory.controller';
import { validate, validateParams, validateQuery, laboratoryValidation, genericValidation } from '@utils/validator';

const laboratoryRouter = express.Router();

// ===============================================
// LAB TEST CATALOG ROUTES
// ===============================================

laboratoryRouter.get("/tests",
  validateQuery(laboratoryValidation.searchTests),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getAllTests(req, res);
  }
);

laboratoryRouter.get("/tests/:testId",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestById(req, res);
  }
);

laboratoryRouter.get("/tests/code/:testCode",
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestByCode(req, res);
  }
);

laboratoryRouter.get("/tests/category/:category",
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestsByCategory(req, res);
  }
);

laboratoryRouter.post("/tests",
  validate(laboratoryValidation.createTest),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createLabTest(req, res);
  }
);

laboratoryRouter.put("/tests/:testId",
  validateParams(genericValidation.id),
  validate(laboratoryValidation.updateTest),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.updateLabTest(req, res);
  }
);

laboratoryRouter.patch("/tests/:testId/deactivate",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.deactivateLabTest(req, res);
  }
);

// ===============================================
// TEST ORDER ROUTES
// ===============================================

laboratoryRouter.post("/orders",
  validate(laboratoryValidation.createOrder),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createTestOrder(req, res);
  }
);

laboratoryRouter.get("/orders/:orderId",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestOrder(req, res);
  }
);

laboratoryRouter.get("/orders/patient/:patientId",
  validateParams(genericValidation.id),
  validateQuery(laboratoryValidation.searchOrders),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getPatientTestOrders(req, res);
  }
);

laboratoryRouter.get("/orders/doctor/:doctorId",
  validateParams(genericValidation.id),
  validateQuery(laboratoryValidation.searchOrders),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getDoctorTestOrders(req, res);
  }
);

laboratoryRouter.get("/orders/status/pending",
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getPendingOrders(req, res);
  }
);

laboratoryRouter.get("/orders/status/overdue",
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getOverdueOrders(req, res);
  }
);

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

laboratoryRouter.patch("/orders/:orderId/collect",
  validateParams(genericValidation.id),
  validate(laboratoryValidation.collectSpecimen),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.collectSpecimen(req, res);
  }
);

laboratoryRouter.patch("/orders/:orderId/process",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.startProcessing(req, res);
  }
);

// ===============================================
// RESULTS MANAGEMENT ROUTES
// ===============================================

laboratoryRouter.post("/orders/:orderId/results",
  validateParams(genericValidation.id),
  validate(laboratoryValidation.addResults),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.addTestResults(req, res);
  }
);

laboratoryRouter.get("/orders/:orderId/results",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getTestResults(req, res);
  }
);

laboratoryRouter.patch("/orders/:orderId/review",
  validateParams(genericValidation.id),
  validate(laboratoryValidation.reviewResults),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.reviewTestResults(req, res);
  }
);

laboratoryRouter.get("/results/critical",
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getCriticalResults(req, res);
  }
);

// ===============================================
// REPORTING ROUTES
// ===============================================

laboratoryRouter.post("/reports/patient/:patientId",
  validateParams(genericValidation.id),
  validate(laboratoryValidation.generateReport),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.generateLabReport(req, res);
  }
);

laboratoryRouter.get("/statistics",
  validateQuery(laboratoryValidation.statisticsQuery),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getLabStatistics(req, res);
  }
);

laboratoryRouter.get("/workload",
  validateQuery(laboratoryValidation.workloadQuery),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getWorkload(req, res);
  }
);

// ===============================================
// SPECIALIZED ENDPOINTS
// ===============================================

laboratoryRouter.get("/catalog/department/:department",
  async (req: ExpressRequest, res: Response) => {
    const { department } = req.params;
    req.query.department = department;
    await laboratoryController.getAllTests(req, res);
  }
);

laboratoryRouter.post("/orders/bulk",
  validate(laboratoryValidation.createOrder),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createTestOrder(req, res);
  }
);

laboratoryRouter.get("/quality-control/summary",
  async (req: ExpressRequest, res: Response) => {
    res.json({ message: "Quality control endpoint - to be implemented in Phase 2" });
  }
);

laboratoryRouter.get("/equipment/status",
  async (req: ExpressRequest, res: Response) => {
    res.json({ message: "Equipment status endpoint - to be implemented in Phase 2" });
  }
);

export default laboratoryRouter;
