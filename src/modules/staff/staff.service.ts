import { Op } from 'sequelize';
import { StaffProfile } from '../../models';
import { EmploymentType, EmploymentStatus } from '@modules/staff/staff-profile.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateStaffData {
  employee_no: string;
  first_name: string;
  last_name: string;
  job_title: string;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  hire_date: string;
  termination_date?: string;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  base_salary?: number;
  notes?: string;
  user_id?: string;
  department_id?: string;
  tenant_id: string;
}

/** Load a staff profile and assert it belongs to the tenant. */
export async function assertStaff(staffId: string, tenantId: string): Promise<StaffProfile> {
  if (!ValidationUtil.isValidUUID(staffId)) throw new Error('Invalid staff ID format');
  const staff = await StaffProfile.findByPk(staffId);
  if (!staff || staff.tenant_id !== tenantId) throw new Error('Staff member not found');
  return staff;
}

export const staffService = {
  createStaff: async (data: CreateStaffData) => {
    const { employee_no, first_name, last_name, job_title, hire_date, tenant_id } = data;
    if (!employee_no || !first_name || !last_name || !job_title || !hire_date || !tenant_id) {
      throw new Error('employee_no, first_name, last_name, job_title, hire_date, and tenant context are required');
    }
    try {
      return await StaffProfile.create({
        employee_no,
        first_name,
        last_name,
        job_title,
        employment_type: data.employment_type || EmploymentType.FULL_TIME,
        employment_status: data.employment_status || EmploymentStatus.ACTIVE,
        hire_date,
        termination_date: data.termination_date || null,
        email: data.email || null,
        phone: data.phone || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        license_number: data.license_number || null,
        license_type: data.license_type || null,
        license_expiry: data.license_expiry || null,
        base_salary: data.base_salary ?? null,
        notes: data.notes || null,
        user_id: data.user_id || null,
        department_id: data.department_id || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error(`A staff member with employee number '${employee_no}' already exists`);
      throw error;
    }
  },

  listStaff: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { q?: string; employment_status?: EmploymentStatus; department_id?: string } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.employment_status) where.employment_status = filters.employment_status;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.q) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${filters.q}%` } },
        { last_name: { [Op.iLike]: `%${filters.q}%` } },
        { employee_no: { [Op.iLike]: `%${filters.q}%` } },
        { job_title: { [Op.iLike]: `%${filters.q}%` } }
      ];
    }
    const { count, rows: staff } = await StaffProfile.findAndCountAll({
      where,
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { staff, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getStaffById: async (staffId: string, tenantId: string) => {
    return assertStaff(staffId, tenantId);
  },

  updateStaff: async (staffId: string, tenantId: string, updateData: Partial<CreateStaffData>) => {
    const staff = await assertStaff(staffId, tenantId);
    const patch: any = { ...updateData };
    delete patch.tenant_id;
    delete patch.employee_no; // immutable business key
    try {
      await staff.update(patch);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error('A staff member with that employee number already exists');
      throw error;
    }
    return staff;
  },

  deleteStaff: async (staffId: string, tenantId: string) => {
    const staff = await assertStaff(staffId, tenantId);
    await staff.destroy();
    return true;
  },

  /**
   * Licences expiring within `withinDays` (default 60), plus any already
   * expired. Ordered soonest-first so HR can chase renewals.
   */
  getExpiringLicences: async (tenantId: string, withinDays = 60) => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + withinDays);
    const horizonStr = horizon.toISOString().slice(0, 10);

    const staff = await StaffProfile.findAll({
      where: {
        tenant_id: tenantId,
        employment_status: { [Op.ne]: EmploymentStatus.TERMINATED },
        license_expiry: { [Op.ne]: null, [Op.lte]: horizonStr } as any
      },
      order: [['license_expiry', 'ASC']]
    });

    const today = new Date().toISOString().slice(0, 10);
    return staff.map(s => ({
      id: s.id,
      employee_no: s.employee_no,
      name: s.full_name,
      job_title: s.job_title,
      license_type: s.license_type,
      license_number: s.license_number,
      license_expiry: s.license_expiry,
      expired: !!s.license_expiry && s.license_expiry < today
    }));
  }
};
