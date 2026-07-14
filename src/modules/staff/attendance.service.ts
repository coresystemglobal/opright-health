import { Op } from 'sequelize';
import { Attendance, LeaveRequest, StaffProfile } from '../../models';
import { AttendanceStatus } from '@modules/staff/attendance.model';
import { LeaveStatus } from '@modules/staff/leave-request.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { assertStaff } from '@modules/staff/staff.service';

const STAFF_ATTRS = ['id', 'employee_no', 'first_name', 'last_name', 'job_title'];

/** Local YYYY-MM-DD for a date. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const attendanceService = {
  /**
   * Clock a staff member in for a work day. Idempotent per (staff, day): a
   * second clock-in on the same day is rejected rather than duplicated.
   */
  clockIn: async (staffId: string, tenantId: string, opts: { at?: Date; status?: AttendanceStatus; notes?: string } = {}) => {
    await assertStaff(staffId, tenantId);
    const at = opts.at ? new Date(opts.at) : new Date();
    const workDate = toDateStr(at);

    const existing = await Attendance.findOne({ where: { tenant_id: tenantId, staff_id: staffId, work_date: workDate } });
    if (existing && existing.clock_in) throw new Error('Staff member has already clocked in for this day');

    if (existing) {
      await existing.update({ clock_in: at, status: opts.status || AttendanceStatus.PRESENT, notes: opts.notes ?? existing.notes });
      return existing;
    }
    return Attendance.create({
      staff_id: staffId,
      work_date: workDate,
      clock_in: at,
      hours_worked: 0,
      status: opts.status || AttendanceStatus.PRESENT,
      notes: opts.notes || null,
      tenant_id: tenantId
    } as any);
  },

  /** Clock out for the day and compute hours worked from the clock-in time. */
  clockOut: async (staffId: string, tenantId: string, opts: { at?: Date; notes?: string } = {}) => {
    await assertStaff(staffId, tenantId);
    const at = opts.at ? new Date(opts.at) : new Date();
    const workDate = toDateStr(at);

    const record = await Attendance.findOne({ where: { tenant_id: tenantId, staff_id: staffId, work_date: workDate } });
    if (!record || !record.clock_in) throw new Error('No clock-in found for this day');
    if (record.clock_out) throw new Error('Staff member has already clocked out for this day');
    if (at <= new Date(record.clock_in)) throw new Error('clock-out time must be after clock-in time');

    const hours = Math.round(((at.getTime() - new Date(record.clock_in).getTime()) / 3600000) * 100) / 100;
    await record.update({ clock_out: at, hours_worked: hours, notes: opts.notes ?? record.notes });
    return record;
  },

  listAttendance: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { staff_id?: string; status?: AttendanceStatus; from?: string; to?: string } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.staff_id) where.staff_id = filters.staff_id;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.work_date = {};
      if (filters.from) where.work_date[Op.gte] = filters.from;
      if (filters.to) where.work_date[Op.lte] = filters.to;
    }
    const { count, rows: records } = await Attendance.findAndCountAll({
      where,
      include: [{ model: StaffProfile, attributes: STAFF_ATTRS }],
      order: [['work_date', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { records, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  /**
   * Payroll data feed (not a full payroll run): per-staff hours worked and
   * approved leave days over a date range. Intended for export/handoff to an
   * external payroll system.
   */
  getPayrollExport: async (tenantId: string, from: string, to: string) => {
    if (!from || !to) throw new Error('from and to dates are required');
    if (to < from) throw new Error('to must be on or after from');

    const [staff, attendance, leave] = await Promise.all([
      StaffProfile.findAll({ where: { tenant_id: tenantId }, attributes: [...STAFF_ATTRS, 'base_salary', 'employment_type', 'employment_status'] }),
      Attendance.findAll({ where: { tenant_id: tenantId, work_date: { [Op.gte]: from, [Op.lte]: to } } }),
      LeaveRequest.findAll({
        where: {
          tenant_id: tenantId,
          status: LeaveStatus.APPROVED,
          start_date: { [Op.lte]: to },
          end_date: { [Op.gte]: from }
        }
      })
    ]);

    const hoursByStaff: Record<string, number> = {};
    const daysPresentByStaff: Record<string, number> = {};
    for (const a of attendance) {
      hoursByStaff[a.staff_id] = (hoursByStaff[a.staff_id] || 0) + Number(a.hours_worked || 0);
      if (Number(a.hours_worked || 0) > 0) daysPresentByStaff[a.staff_id] = (daysPresentByStaff[a.staff_id] || 0) + 1;
    }
    const leaveDaysByStaff: Record<string, number> = {};
    for (const l of leave) {
      leaveDaysByStaff[l.staff_id] = (leaveDaysByStaff[l.staff_id] || 0) + l.days;
    }

    const rows = staff.map(s => ({
      staff_id: s.id,
      employee_no: s.employee_no,
      name: s.full_name,
      job_title: s.job_title,
      employment_type: (s as any).employment_type,
      employment_status: (s as any).employment_status,
      base_salary: (s as any).base_salary ?? null,
      hours_worked: Math.round((hoursByStaff[s.id] || 0) * 100) / 100,
      days_present: daysPresentByStaff[s.id] || 0,
      leave_days: leaveDaysByStaff[s.id] || 0
    }));

    return { period: { from, to }, staff_count: rows.length, rows };
  }
};
