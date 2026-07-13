import { Request, Response } from 'express';
import { staffService } from '@modules/staff/staff.service';
import { shiftService } from '@modules/staff/shift.service';
import { leaveService } from '@modules/staff/leave.service';
import { attendanceService } from '@modules/staff/attendance.service';
import { EmploymentStatus } from '@modules/staff/staff-profile.model';
import { ShiftType, ShiftStatus } from '@modules/staff/shift.model';
import { LeaveType, LeaveStatus } from '@modules/staff/leave-request.model';
import { AttendanceStatus } from '@modules/staff/attendance.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('already exists') || msg.includes('already clocked')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be') || msg.includes('cannot') || msg.includes('Only ') || msg.includes('No clock-in')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const staffController = {
  // ── Staff profiles ──────────────────────────────────────────────────────────
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const staff = await staffService.createStaff({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, staff, 'Staff member created successfully', 201);
    } catch (e) { return fail(res, e, 'create staff member'); }
  },
  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { q, employment_status, department_id } = req.query as Record<string, string>;
      const r = await staffService.listStaff(tenantId, paged(req), { q, employment_status: employment_status as EmploymentStatus, department_id });
      return ResponseUtil.paginated(res, r.staff, r.count, r.page, r.limit, 'Staff retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve staff'); }
  },
  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await staffService.getStaffById(req.params.id, tenantId), 'Staff member retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve staff member'); }
  },
  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await staffService.updateStaff(req.params.id, tenantId, req.body), 'Staff member updated successfully');
    } catch (e) { return fail(res, e, 'update staff member'); }
  },
  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      await staffService.deleteStaff(req.params.id, tenantId);
      return ResponseUtil.success(res, null, 'Staff member deleted successfully');
    } catch (e) { return fail(res, e, 'delete staff member'); }
  },
  expiringLicences: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const within = req.query.within_days ? parseInt(req.query.within_days as string, 10) : 60;
      return ResponseUtil.success(res, await staffService.getExpiringLicences(tenantId, within), 'Expiring licences retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve expiring licences'); }
  },

  // ── Shifts / roster ───────────────────────────────────────────────────────
  createShift: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const shift = await shiftService.createShift({ ...req.body, created_by: userOf(req), tenant_id: tenantId });
      return ResponseUtil.success(res, shift, 'Shift created successfully', 201);
    } catch (e) { return fail(res, e, 'create shift'); }
  },
  listShifts: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { staff_id, department_id, shift_type, status, on_call, from, to } = req.query as Record<string, string>;
      const r = await shiftService.listShifts(tenantId, paged(req), {
        staff_id, department_id, shift_type: shift_type as ShiftType, status: status as ShiftStatus,
        on_call: on_call === undefined ? undefined : on_call === 'true', from, to
      });
      return ResponseUtil.paginated(res, r.shifts, r.count, r.page, r.limit, 'Shifts retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve shifts'); }
  },
  getShift: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await shiftService.getShiftById(req.params.id, tenantId), 'Shift retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve shift'); }
  },
  updateShift: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await shiftService.updateShift(req.params.id, tenantId, req.body), 'Shift updated successfully');
    } catch (e) { return fail(res, e, 'update shift'); }
  },
  deleteShift: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      await shiftService.deleteShift(req.params.id, tenantId);
      return ResponseUtil.success(res, null, 'Shift deleted successfully');
    } catch (e) { return fail(res, e, 'delete shift'); }
  },
  onCallRoster: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { from, to } = req.query as Record<string, string>;
      return ResponseUtil.success(res, await shiftService.getOnCallRoster(tenantId, from, to), 'On-call roster retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve on-call roster'); }
  },

  // ── Leave requests ────────────────────────────────────────────────────────
  createLeave: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const request = await leaveService.createLeave({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, request, 'Leave request submitted successfully', 201);
    } catch (e) { return fail(res, e, 'submit leave request'); }
  },
  listLeave: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { staff_id, status, leave_type } = req.query as Record<string, string>;
      const r = await leaveService.listLeave(tenantId, paged(req), { staff_id, status: status as LeaveStatus, leave_type: leave_type as LeaveType });
      return ResponseUtil.paginated(res, r.requests, r.count, r.page, r.limit, 'Leave requests retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve leave requests'); }
  },
  getLeave: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await leaveService.getLeaveById(req.params.id, tenantId), 'Leave request retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve leave request'); }
  },
  approveLeave: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const request = await leaveService.review(req.params.id, tenantId, 'approve', userOf(req), req.body?.review_notes);
      return ResponseUtil.success(res, request, 'Leave request approved');
    } catch (e) { return fail(res, e, 'approve leave request'); }
  },
  rejectLeave: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const request = await leaveService.review(req.params.id, tenantId, 'reject', userOf(req), req.body?.review_notes);
      return ResponseUtil.success(res, request, 'Leave request rejected');
    } catch (e) { return fail(res, e, 'reject leave request'); }
  },
  cancelLeave: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const request = await leaveService.cancelLeave(req.params.id, tenantId);
      return ResponseUtil.success(res, request, 'Leave request cancelled');
    } catch (e) { return fail(res, e, 'cancel leave request'); }
  },
  leaveBalance: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      return ResponseUtil.success(res, await leaveService.getLeaveBalance(req.params.id, tenantId, year), 'Leave balance retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve leave balance'); }
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  clockIn: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { at, status, notes } = req.body || {};
      const record = await attendanceService.clockIn(req.params.id, tenantId, { at, status: status as AttendanceStatus, notes });
      return ResponseUtil.success(res, record, 'Clocked in successfully', 201);
    } catch (e) { return fail(res, e, 'clock in'); }
  },
  clockOut: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { at, notes } = req.body || {};
      const record = await attendanceService.clockOut(req.params.id, tenantId, { at, notes });
      return ResponseUtil.success(res, record, 'Clocked out successfully');
    } catch (e) { return fail(res, e, 'clock out'); }
  },
  listAttendance: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { staff_id, status, from, to } = req.query as Record<string, string>;
      const r = await attendanceService.listAttendance(tenantId, paged(req), { staff_id, status: status as AttendanceStatus, from, to });
      return ResponseUtil.paginated(res, r.records, r.count, r.page, r.limit, 'Attendance retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve attendance'); }
  },
  payrollExport: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { from, to } = req.query as Record<string, string>;
      return ResponseUtil.success(res, await attendanceService.getPayrollExport(tenantId, from, to), 'Payroll export generated successfully');
    } catch (e) { return fail(res, e, 'generate payroll export'); }
  }
};

export default staffController;
