import express, { Request, Response } from 'express';
import staffController from './staff.controller';
import performanceReviewController from './performance-review.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, staffValidation, performanceReviewValidation, genericValidation } from '@utils/validator';

const staffRouter = express.Router();

// Every HR endpoint requires an authenticated, tenant-scoped caller.
staffRouter.use(authentication, tenantMiddleware);

// Read → staff:view, write/approve → staff:manage. SUPER_ADMIN/ADMIN hold both.
const VIEW = checkPermission(PERMISSIONS.STAFF_VIEW);
const MANAGE = checkPermission(PERMISSIONS.STAFF_MANAGE);
const wrap = (fn: (req: Request, res: Response) => Promise<Response>) => (req: Request, res: Response) => fn(req, res);

// ── Licence expiry (before /:id) ────────────────────────────────────────────
staffRouter.get('/licences/expiring', VIEW, wrap(staffController.expiringLicences));

// ── Shifts / roster (before /:id) ───────────────────────────────────────────
staffRouter.get('/shifts/on-call', VIEW, validateQuery(staffValidation.roster), wrap(staffController.onCallRoster));
staffRouter.post('/shifts', MANAGE, validate(staffValidation.createShift), wrap(staffController.createShift));
staffRouter.get('/shifts', VIEW, validateQuery(staffValidation.listShifts), wrap(staffController.listShifts));
staffRouter.get('/shifts/:id', VIEW, validateParams(genericValidation.id), wrap(staffController.getShift));
staffRouter.put('/shifts/:id', MANAGE, validateParams(genericValidation.id), validate(staffValidation.updateShift), wrap(staffController.updateShift));
staffRouter.delete('/shifts/:id', MANAGE, validateParams(genericValidation.id), wrap(staffController.deleteShift));

// ── Leave requests (before /:id) ────────────────────────────────────────────
staffRouter.post('/leave', MANAGE, validate(staffValidation.createLeave), wrap(staffController.createLeave));
staffRouter.get('/leave', VIEW, validateQuery(staffValidation.listLeave), wrap(staffController.listLeave));
staffRouter.get('/leave/:id', VIEW, validateParams(genericValidation.id), wrap(staffController.getLeave));
staffRouter.patch('/leave/:id/approve', MANAGE, validateParams(genericValidation.id), validate(staffValidation.reviewLeave), wrap(staffController.approveLeave));
staffRouter.patch('/leave/:id/reject', MANAGE, validateParams(genericValidation.id), validate(staffValidation.reviewLeave), wrap(staffController.rejectLeave));
staffRouter.patch('/leave/:id/cancel', MANAGE, validateParams(genericValidation.id), wrap(staffController.cancelLeave));

// ── Performance reviews (before /:id) ───────────────────────────────────────
staffRouter.post('/reviews', MANAGE, validate(performanceReviewValidation.create), wrap(performanceReviewController.create));
staffRouter.get('/reviews', VIEW, validateQuery(performanceReviewValidation.list), wrap(performanceReviewController.list));
staffRouter.get('/reviews/:id', VIEW, validateParams(genericValidation.id), wrap(performanceReviewController.get));
staffRouter.put('/reviews/:id', MANAGE, validateParams(genericValidation.id), validate(performanceReviewValidation.update), wrap(performanceReviewController.update));
staffRouter.patch('/reviews/:id/submit', MANAGE, validateParams(genericValidation.id), wrap(performanceReviewController.submit));
staffRouter.patch('/reviews/:id/acknowledge', MANAGE, validateParams(genericValidation.id), validate(performanceReviewValidation.acknowledge), wrap(performanceReviewController.acknowledge));
staffRouter.patch('/reviews/:id/finalize', MANAGE, validateParams(genericValidation.id), wrap(performanceReviewController.finalize));
staffRouter.delete('/reviews/:id', MANAGE, validateParams(genericValidation.id), wrap(performanceReviewController.remove));

// ── Attendance & payroll (before /:id) ──────────────────────────────────────
staffRouter.get('/attendance', VIEW, validateQuery(staffValidation.listAttendance), wrap(staffController.listAttendance));
staffRouter.get('/payroll/export', MANAGE, validateQuery(staffValidation.payrollExport), wrap(staffController.payrollExport));
staffRouter.post('/:id/clock-in', MANAGE, validateParams(genericValidation.id), validate(staffValidation.clockIn), wrap(staffController.clockIn));
staffRouter.post('/:id/clock-out', MANAGE, validateParams(genericValidation.id), validate(staffValidation.clockOut), wrap(staffController.clockOut));
staffRouter.get('/:id/leave-balance', VIEW, validateParams(genericValidation.id), wrap(staffController.leaveBalance));

// ── Staff profile CRUD ──────────────────────────────────────────────────────
staffRouter.post('/', MANAGE, validate(staffValidation.create), wrap(staffController.create));
staffRouter.get('/', VIEW, validateQuery(staffValidation.list), wrap(staffController.list));
staffRouter.get('/:id', VIEW, validateParams(genericValidation.id), wrap(staffController.get));
staffRouter.put('/:id', MANAGE, validateParams(genericValidation.id), validate(staffValidation.update), wrap(staffController.update));
staffRouter.delete('/:id', MANAGE, validateParams(genericValidation.id), wrap(staffController.remove));

export default staffRouter;
