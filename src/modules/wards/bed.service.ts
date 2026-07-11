import { Bed, Ward } from '../../models';
import { BedType, BedStatus } from '@modules/wards/bed.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateBedData {
  ward_id: string;
  bed_number: string;
  bed_type?: BedType;
  notes?: string;
  tenant_id: string;
}

// Statuses an operator may set directly. OCCUPIED is driven only by admissions.
const MANUAL_STATUSES = [BedStatus.AVAILABLE, BedStatus.CLEANING, BedStatus.MAINTENANCE, BedStatus.BLOCKED, BedStatus.RESERVED];

export const bedService = {
  createBed: async (data: CreateBedData) => {
    const { ward_id, bed_number, tenant_id } = data;
    if (!ward_id || !bed_number || !tenant_id) {
      throw new Error('ward_id, bed_number, and tenant context are required');
    }
    if (!ValidationUtil.isValidUUID(ward_id)) throw new Error('Invalid ward ID format');

    const ward = await Ward.findByPk(ward_id);
    if (!ward) throw new Error('Ward not found');
    if (ward.tenant_id !== tenant_id) throw new Error('Ward does not belong to this tenant');

    try {
      return await Bed.create({
        ward_id,
        bed_number,
        bed_type: data.bed_type || BedType.STANDARD,
        status: BedStatus.AVAILABLE,
        notes: data.notes || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`Bed '${bed_number}' already exists in this ward`);
      }
      throw error;
    }
  },

  getBedsByWard: async (wardId: string, paginationQuery: PaginationQuery, status?: BedStatus) => {
    if (!ValidationUtil.isValidUUID(wardId)) throw new Error('Invalid ward ID format');
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { ward_id: wardId };
    if (status) where.status = status;

    const { count, rows: beds } = await Bed.findAndCountAll({
      where,
      order: [['bed_number', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { beds, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getBedById: async (bedId: string) => {
    if (!ValidationUtil.isValidUUID(bedId)) throw new Error('Invalid bed ID format');
    const bed = await Bed.findByPk(bedId, { include: [{ model: Ward, as: 'ward' }] });
    if (!bed) throw new Error('Bed not found');
    return bed;
  },

  updateBed: async (bedId: string, updateData: { bed_number?: string; bed_type?: BedType; notes?: string; is_active?: boolean }) => {
    if (!ValidationUtil.isValidUUID(bedId)) throw new Error('Invalid bed ID format');
    const bed = await Bed.findByPk(bedId);
    if (!bed) throw new Error('Bed not found');
    try {
      await bed.update(updateData);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new Error('A bed with that number already exists in this ward');
      }
      throw error;
    }
    return bed;
  },

  /**
   * Manually change a bed's status (cleaning / maintenance / blocked / available
   * / reserved). Cannot set OCCUPIED here — that only happens via an admission —
   * and cannot move an OCCUPIED bed while a patient is assigned.
   */
  changeBedStatus: async (bedId: string, status: BedStatus) => {
    if (!ValidationUtil.isValidUUID(bedId)) throw new Error('Invalid bed ID format');
    if (!MANUAL_STATUSES.includes(status)) {
      throw new Error(`Cannot set status '${status}' manually. Occupancy is managed through admissions.`);
    }
    const bed = await Bed.findByPk(bedId);
    if (!bed) throw new Error('Bed not found');
    if (bed.status === BedStatus.OCCUPIED) {
      throw new Error('Bed is occupied — discharge or transfer the patient before changing its status');
    }
    await bed.update({ status });
    return bed;
  },

  deleteBed: async (bedId: string) => {
    if (!ValidationUtil.isValidUUID(bedId)) throw new Error('Invalid bed ID format');
    const bed = await Bed.findByPk(bedId);
    if (!bed) throw new Error('Bed not found');
    if (bed.status === BedStatus.OCCUPIED) {
      throw new Error('Cannot delete an occupied bed');
    }
    await bed.destroy();
    return true;
  },

  /**
   * Availability board: per-ward bed counts by status for a tenant, optionally
   * filtered to one hospital. One query, aggregated in memory.
   */
  getAvailabilityBoard: async (tenantId: string, hospitalId?: string) => {
    const wardWhere: any = { tenant_id: tenantId, is_active: true };
    if (hospitalId) wardWhere.hospital_id = hospitalId;

    const wards = await Ward.findAll({
      where: wardWhere,
      include: [{ model: Bed, as: 'beds', attributes: ['status'] }],
      order: [['name', 'ASC']]
    });

    const board = wards.map((w: any) => {
      const counts: Record<string, number> = { total: 0 };
      for (const s of Object.values(BedStatus)) counts[s] = 0;
      for (const b of (w.beds || [])) {
        counts[b.status] = (counts[b.status] || 0) + 1;
        counts.total++;
      }
      return {
        ward_id: w.id,
        ward_name: w.name,
        ward_code: w.code,
        ward_type: w.ward_type,
        hospital_id: w.hospital_id,
        counts
      };
    });

    const totals: Record<string, number> = { total: 0 };
    for (const s of Object.values(BedStatus)) totals[s] = 0;
    for (const row of board) {
      for (const key of Object.keys(row.counts)) totals[key] = (totals[key] || 0) + row.counts[key];
    }

    return { wards: board, totals };
  }
};
