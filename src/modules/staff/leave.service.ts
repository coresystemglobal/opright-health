import { Op } from 'sequelize';
import { LeaveRequest, StaffProfile } from '../../models';
import { LeaveType, LeaveStatus } from '@modules/staff/leave-request.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { assertStaff } from '@modules/staff/staff.service';

interface CreateLeaveData {
  staff_id: string;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
  tenant_id: string;
}

const STAFF_ATTRS = ['id', 'employee_no', 'first_name', 'last_name', 'job_title'];

/** Inclusive whole-day count between two ISO date strings. */
export function inclusiveDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export const leaveService = {
  createLeave: async (data: CreateLeaveData) => {
    const { staff_id, start_date, end_date, tenant_id } = data;
    if (!staff_id || !start_date || !end_date || !tenant_id) throw new Error('staff_id, start_date, end_date, and tenant context are required');
    await assertStaff(staff_id, tenant_id);

    const days = inclusiveDays(start_date, end_date);
    if (days < 1) throw new Error('end_date must be on or after start_date');

    return LeaveRequest.create({
      staff_id,
      leave_type: data.leave_type || LeaveType.ANNUAL,
      start_date,
      end_date,
      days,
      reason: data.reason || null,
      status: LeaveStatus.PENDING,
      tenant_id
    } as any);
  },

  listLeave: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { staff_id?: string; status?: LeaveStatus; leave_type?: LeaveType } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.staff_id) where.staff_id = filters.staff_id;
    if (filters.status) where.status = filters.status;
    if (filters.leave_type) where.leave_type = filters.leave_type;

    const { count, rows: requests } = await LeaveRequest.findAndCountAll({
      where,
      include: [{ model: StaffProfile, attributes: STAFF_ATTRS }],
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { requests, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getLeaveById: async (leaveId: string, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(leaveId)) throw new Error('Invalid leave request ID format');
    const request = await LeaveRequest.findByPk(leaveId, { include: [{ model: StaffProfile, attributes: STAFF_ATTRS }] });
    if (!request || request.tenant_id !== tenantId) throw new Error('Leave request not found');
    return request;
  },

  /** Approve or reject a pending request. */
  review: async (leaveId: string, tenantId: string, decision: 'approve' | 'reject', reviewerId: string, notes?: string) => {
    const request = await leaveService.getLeaveById(leaveId, tenantId);
    if (request.status !== LeaveStatus.PENDING) throw new Error(`Only pending requests can be reviewed (current status: ${request.status})`);
    await request.update({
      status: decision === 'approve' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
      reviewed_by: reviewerId || null,
      reviewed_at: new Date(),
      review_notes: notes || null
    });
    return request;
  },

  /** Withdraw a request that hasn't been actioned yet, or an approved future leave. */
  cancelLeave: async (leaveId: string, tenantId: string) => {
    const request = await leaveService.getLeaveById(leaveId, tenantId);
    if (request.status === LeaveStatus.REJECTED || request.status === LeaveStatus.CANCELLED) {
      throw new Error(`A ${request.status} request cannot be cancelled`);
    }
    await request.update({ status: LeaveStatus.CANCELLED });
    return request;
  },

  /** Approved leave-day totals per type for one staff member (optionally by year). */
  getLeaveBalance: async (staffId: string, tenantId: string, year?: number) => {
    await assertStaff(staffId, tenantId);
    const where: any = { tenant_id: tenantId, staff_id: staffId, status: LeaveStatus.APPROVED };
    if (year) {
      where.start_date = { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` };
    }
    const requests = await LeaveRequest.findAll({ where });
    const byType: Record<string, number> = {};
    let total = 0;
    for (const r of requests) {
      byType[r.leave_type] = (byType[r.leave_type] || 0) + r.days;
      total += r.days;
    }
    return { staff_id: staffId, year: year || null, total_days: total, by_type: byType };
  }
};
