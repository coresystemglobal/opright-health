import { Ward, Bed } from '../../models';
import { WardType, WardGenderRestriction } from '@modules/wards/ward.model';
import { BedStatus } from '@modules/wards/bed.model';
import { AdmissionStatus } from '@modules/wards/admission.model';
import { Admission } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateWardData {
  hospital_id: string;
  department_id?: string;
  name: string;
  code: string;
  ward_type?: WardType;
  gender_restriction?: WardGenderRestriction;
  floor?: string;
  description?: string;
  tenant_id: string;
}

interface WardFilters {
  hospital_id?: string;
  department_id?: string;
  ward_type?: WardType;
  is_active?: boolean;
}

/** Count a ward's beds by status. */
async function bedCounts(wardId: string): Promise<Record<string, number>> {
  const beds = await Bed.findAll({ where: { ward_id: wardId }, attributes: ['status'], raw: true });
  const counts: Record<string, number> = { total: beds.length };
  for (const s of Object.values(BedStatus)) counts[s] = 0;
  for (const b of beds as any[]) counts[b.status] = (counts[b.status] || 0) + 1;
  return counts;
}

export const wardService = {
  createWard: async (data: CreateWardData) => {
    const { hospital_id, name, code, tenant_id } = data;
    if (!hospital_id || !name || !code || !tenant_id) {
      throw new Error('hospital_id, name, code, and tenant context are required');
    }
    for (const id of [hospital_id, tenant_id]) {
      if (!ValidationUtil.isValidUUID(id)) throw new Error(`Invalid UUID format: ${id}`);
    }
    if (data.department_id && !ValidationUtil.isValidUUID(data.department_id)) {
      throw new Error('Invalid department ID format');
    }

    try {
      return await Ward.create({
        hospital_id,
        department_id: data.department_id || null,
        name,
        code,
        ward_type: data.ward_type || WardType.GENERAL,
        gender_restriction: data.gender_restriction || WardGenderRestriction.MIXED,
        floor: data.floor || null,
        description: data.description || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`A ward with code '${code}' already exists`);
      }
      throw error;
    }
  },

  getWards: async (tenantId: string, paginationQuery: PaginationQuery, filters: WardFilters = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.hospital_id) where.hospital_id = filters.hospital_id;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.ward_type) where.ward_type = filters.ward_type;
    if (filters.is_active !== undefined) where.is_active = filters.is_active;

    const { count, rows: wards } = await Ward.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });

    return { wards, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getWardById: async (wardId: string) => {
    if (!ValidationUtil.isValidUUID(wardId)) throw new Error('Invalid ward ID format');
    const ward = await Ward.findByPk(wardId, { include: [{ model: Bed, as: 'beds' }] });
    if (!ward) throw new Error('Ward not found');
    const availability = await bedCounts(wardId);
    return { ward, availability };
  },

  getWardAvailability: async (wardId: string) => {
    if (!ValidationUtil.isValidUUID(wardId)) throw new Error('Invalid ward ID format');
    const ward = await Ward.findByPk(wardId);
    if (!ward) throw new Error('Ward not found');
    return { ward_id: wardId, ...(await bedCounts(wardId)) };
  },

  updateWard: async (wardId: string, updateData: Partial<CreateWardData> & { is_active?: boolean }) => {
    if (!ValidationUtil.isValidUUID(wardId)) throw new Error('Invalid ward ID format');
    const ward = await Ward.findByPk(wardId);
    if (!ward) throw new Error('Ward not found');
    try {
      await ward.update(updateData);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new Error('A ward with that code already exists');
      }
      throw error;
    }
    return ward;
  },

  deleteWard: async (wardId: string) => {
    if (!ValidationUtil.isValidUUID(wardId)) throw new Error('Invalid ward ID format');
    const ward = await Ward.findByPk(wardId);
    if (!ward) throw new Error('Ward not found');

    // Block deletion while patients are still admitted to this ward
    const active = await Admission.count({ where: { ward_id: wardId, status: AdmissionStatus.ADMITTED } });
    if (active > 0) {
      throw new Error(`Cannot delete ward: ${active} patient(s) currently admitted`);
    }

    await ward.destroy();
    return true;
  }
};
