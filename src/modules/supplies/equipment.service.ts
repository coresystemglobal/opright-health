import { Op } from 'sequelize';
import { Equipment } from '../../models';
import { EquipmentCategory, EquipmentStatus } from '@modules/supplies/equipment.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateEquipmentData {
  name: string;
  asset_code: string;
  category?: EquipmentCategory;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  department_id?: string;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiry?: string;
  next_maintenance_at?: Date;
  notes?: string;
  tenant_id: string;
}

// Terminal states can't transition further
const TERMINAL = [EquipmentStatus.RETIRED];

export const equipmentService = {
  createEquipment: async (data: CreateEquipmentData) => {
    const { name, asset_code, tenant_id } = data;
    if (!name || !asset_code || !tenant_id) throw new Error('name, asset_code, and tenant context are required');
    if (data.department_id && !ValidationUtil.isValidUUID(data.department_id)) throw new Error('Invalid department ID format');
    try {
      return await Equipment.create({
        name,
        asset_code,
        category: data.category || EquipmentCategory.OTHER,
        status: EquipmentStatus.AVAILABLE,
        serial_number: data.serial_number || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        location: data.location || null,
        department_id: data.department_id || null,
        purchase_date: data.purchase_date || null,
        purchase_cost: data.purchase_cost ?? null,
        warranty_expiry: data.warranty_expiry || null,
        next_maintenance_at: data.next_maintenance_at || null,
        notes: data.notes || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error(`Equipment with asset code '${asset_code}' already exists`);
      throw error;
    }
  },

  listEquipment: async (tenantId: string, paginationQuery: PaginationQuery, filters: { q?: string; category?: EquipmentCategory; status?: EquipmentStatus; department_id?: string } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.q}%` } },
        { asset_code: { [Op.iLike]: `%${filters.q}%` } },
        { serial_number: { [Op.iLike]: `%${filters.q}%` } }
      ];
    }
    const { count, rows } = await Equipment.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { equipment: rows, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getEquipmentById: async (equipmentId: string) => {
    if (!ValidationUtil.isValidUUID(equipmentId)) throw new Error('Invalid equipment ID format');
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    return equipment;
  },

  updateEquipment: async (equipmentId: string, updateData: Partial<CreateEquipmentData>) => {
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    delete (updateData as any).tenant_id;
    delete (updateData as any).status; // status changes go through changeStatus
    try {
      await equipment.update(updateData);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error('Equipment with that asset code already exists');
      throw error;
    }
    return equipment;
  },

  changeStatus: async (equipmentId: string, status: EquipmentStatus) => {
    if (!ValidationUtil.isValidUUID(equipmentId)) throw new Error('Invalid equipment ID format');
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    if (TERMINAL.includes(equipment.status)) {
      throw new Error(`Equipment is ${equipment.status} and cannot change status`);
    }
    await equipment.update({ status });
    return equipment;
  },

  /** Record a completed maintenance and optionally schedule the next one. */
  recordMaintenance: async (equipmentId: string, opts: { next_maintenance_at?: Date; notes?: string; return_to_available?: boolean }) => {
    if (!ValidationUtil.isValidUUID(equipmentId)) throw new Error('Invalid equipment ID format');
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    if (equipment.status === EquipmentStatus.RETIRED) throw new Error('Retired equipment cannot be maintained');

    const update: any = {
      last_maintenance_at: new Date(),
      next_maintenance_at: opts.next_maintenance_at ?? equipment.next_maintenance_at
    };
    if (opts.notes) update.notes = opts.notes;
    if (opts.return_to_available && equipment.status === EquipmentStatus.UNDER_MAINTENANCE) {
      update.status = EquipmentStatus.AVAILABLE;
    }
    await equipment.update(update);
    return equipment;
  },

  deleteEquipment: async (equipmentId: string) => {
    if (!ValidationUtil.isValidUUID(equipmentId)) throw new Error('Invalid equipment ID format');
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    await equipment.destroy();
    return true;
  },

  /** Equipment whose next maintenance is due (on/before now), not retired. */
  getMaintenanceDue: async (tenantId: string) => {
    return Equipment.findAll({
      where: {
        tenant_id: tenantId,
        status: { [Op.ne]: EquipmentStatus.RETIRED },
        next_maintenance_at: { [Op.ne]: null, [Op.lte]: new Date() }
      } as any,
      order: [['next_maintenance_at', 'ASC']]
    });
  }
};
