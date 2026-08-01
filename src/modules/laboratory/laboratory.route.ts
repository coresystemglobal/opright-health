import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import { laboratoryController } from './laboratory.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, laboratoryValidation, genericValidation } from '@utils/validator';

const laboratoryRouter = express.Router();

// Every laboratory endpoint requires an authenticated, tenant-scoped caller.
// (Previously these routes were entirely unauthenticated.)
laboratoryRouter.use(authentication, tenantMiddleware);

const CATALOG = checkPermission(PERMISSIONS.LAB_MANAGE);   // manage the test catalog / lab admin views
const ORDER = checkPermission(PERMISSIONS.LAB_ORDER);      // place/cancel test orders
const RESULT = checkPermission(PERMISSIONS.LAB_RESULT);    // specimen handling, results, review

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
  CATALOG,
  validate(laboratoryValidation.createTest),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createLabTest(req, res);
  }
);

laboratoryRouter.put("/tests/:testId",
  CATALOG,
  validateParams(genericValidation.id),
  validate(laboratoryValidation.updateTest),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.updateLabTest(req, res);
  }
);

laboratoryRouter.patch("/tests/:testId/deactivate",
  CATALOG,
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.deactivateLabTest(req, res);
  }
);

// ===============================================
// TEST ORDER ROUTES
// ===============================================

laboratoryRouter.post("/orders",
  ORDER,
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
  ORDER,
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
  RESULT,
  validateParams(genericValidation.id),
  validate(laboratoryValidation.collectSpecimen),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.collectSpecimen(req, res);
  }
);

laboratoryRouter.patch("/orders/:orderId/process",
  RESULT,
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.startProcessing(req, res);
  }
);

// ===============================================
// RESULTS MANAGEMENT ROUTES
// ===============================================

laboratoryRouter.post("/orders/:orderId/results",
  RESULT,
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
  RESULT,
  validateParams(genericValidation.id),
  validate(laboratoryValidation.reviewResults),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.reviewTestResults(req, res);
  }
);

laboratoryRouter.get("/results/critical",
  RESULT,
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getCriticalResults(req, res);
  }
);

// ===============================================
// REPORTING ROUTES
// ===============================================

laboratoryRouter.post("/reports/patient/:patientId",
  RESULT,
  validateParams(genericValidation.id),
  validate(laboratoryValidation.generateReport),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.generateLabReport(req, res);
  }
);

laboratoryRouter.get("/statistics",
  CATALOG,
  validateQuery(laboratoryValidation.statisticsQuery),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.getLabStatistics(req, res);
  }
);

laboratoryRouter.get("/workload",
  CATALOG,
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
  ORDER,
  validate(laboratoryValidation.createOrder),
  async (req: ExpressRequest, res: Response) => {
    await laboratoryController.createTestOrder(req, res);
  }
);

laboratoryRouter.get("/quality-control/summary",
  CATALOG,
  async (req: ExpressRequest, res: Response) => {
    res.json({ message: "Quality control endpoint - to be implemented in Phase 2" });
  }
);

laboratoryRouter.get("/equipment/status",
  CATALOG,
  async (req: ExpressRequest, res: Response) => {
    res.json({ message: "Equipment status endpoint - to be implemented in Phase 2" });
  }
);

export default laboratoryRouter;
