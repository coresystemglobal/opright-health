import express, { Request, Response } from 'express';
import departmentController from './department.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const departmentRouter = express.Router();

// GET /api/departments — list all (tenant-scoped)
departmentRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_VIEW),
  async (req: Request, res: Response) => {
    await departmentController.getAllDepartments(req, res);
  }
);

// GET /api/departments/:id — get by ID
departmentRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await departmentController.getDepartmentById(req, res);
  }
);

// GET /api/departments/:id/staff — list staff
departmentRouter.get('/:id/staff',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await departmentController.getDepartmentStaff(req, res);
  }
);

// GET /api/departments/:id/analytics — occupancy + metrics
departmentRouter.get('/:id/analytics',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await departmentController.getDepartmentAnalytics(req, res);
  }
);

// POST /api/departments — create department (admin+)
departmentRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_CREATE),
  async (req: Request, res: Response) => {
    await departmentController.createDepartment(req, res);
  }
);

// POST /api/departments/:id/staff — assign staff member
departmentRouter.post('/:id/staff',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_MANAGE_STAFF),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await departmentController.assignStaff(req, res);
  }
);

// PUT /api/departments/:id — update department
departmentRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await departmentController.updateDepartment(req, res);
  }
);

// DELETE /api/departments/:id — deactivate department
departmentRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await departmentController.deactivateDepartment(req, res);
  }
);

// DELETE /api/departments/:id/staff/:assignmentId — remove staff member
departmentRouter.delete('/:id/staff/:assignmentId',
  authentication,
  checkPermission(PERMISSIONS.DEPARTMENT_MANAGE_STAFF),
  async (req: Request, res: Response) => {
    await departmentController.removeStaff(req, res);
  }
);

export default departmentRouter;
