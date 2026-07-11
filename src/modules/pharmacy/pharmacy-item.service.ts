import { Op } from 'sequelize';
import { PharmacyItem, StockBatch } from '../../models';
import { DrugForm, StockUnit } from '@modules/pharmacy/pharmacy-item.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateItemData {
  name: string;
  generic_name?: string;
  sku: string;
  form?: DrugForm;
  strength?: string;
  category?: string;
  unit?: StockUnit;
  unit_price?: number;
  reorder_level?: number;
  tenant_id: string;
}

/** Sum on-hand quantity for an item across its batches. */
export async function itemStockTotal(itemId: string): Promise<number> {
  const rows = await StockBatch.findAll({ where: { pharmacy_item_id: itemId }, attributes: ['quantity'], raw: true });
  return (rows as any[]).reduce((sum, r) => sum + (r.quantity || 0), 0);
}

export const pharmacyItemService = {
  createItem: async (data: CreateItemData) => {
    const { name, sku, tenant_id } = data;
    if (!name || !sku || !tenant_id) throw new Error('name, sku, and tenant context are required');

    try {
      return await PharmacyItem.create({
        name,
        generic_name: data.generic_name || null,
        sku,
        form: data.form || DrugForm.TABLET,
        strength: data.strength || null,
        category: data.category || null,
        unit: data.unit || StockUnit.UNIT,
        unit_price: data.unit_price ?? 0,
        reorder_level: data.reorder_level ?? 0,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`An item with SKU '${sku}' already exists`);
      }
      throw error;
    }
  },

  listItems: async (tenantId: string, paginationQuery: PaginationQuery, filters: { q?: string; category?: string; is_active?: boolean } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.category) where.category = filters.category;
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.q}%` } },
        { generic_name: { [Op.iLike]: `%${filters.q}%` } },
        { sku: { [Op.iLike]: `%${filters.q}%` } }
      ];
    }

    const { count, rows: items } = await PharmacyItem.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { items, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getItemById: async (itemId: string) => {
    if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
    const item = await PharmacyItem.findByPk(itemId, {
      include: [{ model: StockBatch, as: 'batches' }]
    });
    if (!item) throw new Error('Pharmacy item not found');
    const total_stock = await itemStockTotal(itemId);
    return { item, total_stock, is_low_stock: total_stock <= item.reorder_level };
  },

  updateItem: async (itemId: string, updateData: Partial<CreateItemData> & { is_active?: boolean }) => {
    if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
    const item = await PharmacyItem.findByPk(itemId);
    if (!item) throw new Error('Pharmacy item not found');
    try {
      await item.update(updateData);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error('An item with that SKU already exists');
      throw error;
    }
    return item;
  },

  deleteItem: async (itemId: string) => {
    if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
    const item = await PharmacyItem.findByPk(itemId);
    if (!item) throw new Error('Pharmacy item not found');
    const total = await itemStockTotal(itemId);
    if (total > 0) throw new Error(`Cannot delete item with ${total} unit(s) still in stock`);
    await item.destroy();
    return true;
  }
};
