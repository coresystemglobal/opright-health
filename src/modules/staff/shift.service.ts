import { Op } from 'sequelize';
import { Shift, StaffProfile } from '../../models';
import { ShiftType, ShiftStatus } from '@modules/staff/shift.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { assertStaff } from '@modules/staff/staff.service';

interface CreateShiftData {
  staff_id: string;
  shift_type?: ShiftType;
  starts_at: string | Date;
  ends_at: string | Date;
  is_on_call?: boolean;
  notes?: string;
  department_id?: string;
  created_by?: string;
  tenant_id: string;
}

const STAFF_ATTRS = ['id', 'employee_no', 'first_name', 'last_name', 'job_title'];

export const shiftService = {
  createShift: async (data: CreateShiftData) => {
    const { staff_id, starts_at, ends_at, tenant_id } = data;
    if (!staff_id || !starts_at || !ends_at || !tenant_id) throw new Error('staff_id, starts_at, ends_at, and tenant context are required');
    await assertStaff(staff_id, tenant_id); // tenant-scoped existence check

    const start = new Date(starts_at);
    const end = new Date(ends_at);
    if (end <= start) throw new Error('ends_at must be after starts_at');

    const shiftType = data.shift_type || ShiftType.MORNING;
    return Shift.create({
      staff_id,
      shift_type: shiftType,
      starts_at: start,
      ends_at: end,
      is_on_call: data.is_on_call ?? (shiftType === ShiftType.ON_CALL),
      status: ShiftStatus.SCHEDULED,
      notes: data.notes || null,
      department_id: data.department_id || null,
      created_by: data.created_by || null,
      tenant_id
    } as any);
  },

  listShifts: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { staff_id?: string; department_id?: string; shift_type?: ShiftType; status?: ShiftStatus; on_call?: boolean; from?: string; to?: string } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.staff_id) where.staff_id = filters.staff_id;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.shift_type) where.shift_type = filters.shift_type;
    if (filters.status) where.status = filters.status;
    if (filters.on_call !== undefined) where.is_on_call = filters.on_call;
    if (filters.from || filters.to) {
      where.starts_at = {};
      if (filters.from) where.starts_at[Op.gte] = new Date(filters.from);
      if (filters.to) where.starts_at[Op.lte] = new Date(filters.to);
    }

    const { count, rows: shifts } = await Shift.findAndCountAll({
      where,
      include: [{ model: StaffProfile, attributes: STAFF_ATTRS }],
      order: [['starts_at', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { shifts, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getShiftById: async (shiftId: string, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(shiftId)) throw new Error('Invalid shift ID format');
    const shift = await Shift.findByPk(shiftId, { include: [{ model: StaffProfile, attributes: STAFF_ATTRS }] });
    if (!shift || shift.tenant_id !== tenantId) throw new Error('Shift not found');
    return shift;
  },

  updateShift: async (shiftId: string, tenantId: string, update: Partial<CreateShiftData> & { status?: ShiftStatus }) => {
    const shift = await shiftService.getShiftById(shiftId, tenantId);
    const patch: any = { ...update };
    delete patch.tenant_id;
    delete patch.staff_id; // reassigning a shift to another staff member is not supported

    if (patch.starts_at) patch.starts_at = new Date(patch.starts_at);
    if (patch.ends_at) patch.ends_at = new Date(patch.ends_at);
    const start = patch.starts_at || shift.starts_at;
    const end = patch.ends_at || shift.ends_at;
    if (new Date(end) <= new Date(start)) throw new Error('ends_at must be after starts_at');
    if (patch.shift_type && patch.is_on_call === undefined) patch.is_on_call = patch.shift_type === ShiftType.ON_CALL;

    await shift.update(patch);
    return shift;
  },

  deleteShift: async (shiftId: string, tenantId: string) => {
    const shift = await shiftService.getShiftById(shiftId, tenantId);
    await shift.destroy();
    return true;
  },

  /** On-call roster within a date window (defaults to the next 7 days). */
  getOnCallRoster: async (tenantId: string, from?: string, to?: string) => {
    const start = from ? new Date(from) : new Date();
    const end = to ? new Date(to) : new Date(start.getTime() + 7 * 86400000);
    const shifts = await Shift.findAll({
      where: {
        tenant_id: tenantId,
        is_on_call: true,
        status: { [Op.ne]: ShiftStatus.CANCELLED },
        starts_at: { [Op.gte]: start, [Op.lte]: end }
      },
      include: [{ model: StaffProfile, attributes: STAFF_ATTRS }],
      order: [['starts_at', 'ASC']]
    });
    return shifts;
  }
};
