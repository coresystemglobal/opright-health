import { Op } from 'sequelize';
import { SupplyItem, SupplyMovement } from '../../models';
import { SupplyCategory, SupplyUnit } from '@modules/supplies/supply-item.model';
import { SupplyMovementType } from '@modules/supplies/supply-movement.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateItemData {
  name: string;
  sku: string;
  category?: SupplyCategory;
  unit?: SupplyUnit;
  reorder_level?: number;
  unit_price?: number;
  supplier?: string;
  description?: string;
  tenant_id: string;
}

async function assertItem(itemId: string, tenantId: string) {
  if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
  const item = await SupplyItem.findByPk(itemId);
  if (!item) throw new Error('Supply item not found');
  if (item.tenant_id !== tenantId) throw new Error('Item does not belong to this tenant');
  return item;
}

export const supplyService = {
  createItem: async (data: CreateItemData) => {
    const { name, sku, tenant_id } = data;
    if (!name || !sku || !tenant_id) throw new Error('name, sku, and tenant context are required');
    try {
      return await SupplyItem.create({
        name,
        sku,
        category: data.category || SupplyCategory.CONSUMABLE,
        unit: data.unit || SupplyUnit.UNIT,
        on_hand: 0,
        reorder_level: data.reorder_level ?? 0,
        unit_price: data.unit_price ?? 0,
        supplier: data.supplier || null,
        description: data.description || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error(`A supply with SKU '${sku}' already exists`);
      throw error;
    }
  },

  listItems: async (tenantId: string, paginationQuery: PaginationQuery, filters: { q?: string; category?: SupplyCategory; is_active?: boolean } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.category) where.category = filters.category;
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.q}%` } },
        { sku: { [Op.iLike]: `%${filters.q}%` } }
      ];
    }
    const { count, rows: items } = await SupplyItem.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { items, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getItemById: async (itemId: string) => {
    if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
    const item = await SupplyItem.findByPk(itemId);
    if (!item) throw new Error('Supply item not found');
    return item;
  },

  updateItem: async (itemId: string, updateData: Partial<CreateItemData> & { is_active?: boolean }) => {
    const item = await SupplyItem.findByPk(itemId);
    if (!item) throw new Error('Supply item not found');
    // on_hand is ledger-controlled; ignore any attempt to set it directly
    delete (updateData as any).on_hand;
    delete (updateData as any).tenant_id;
    try {
      await item.update(updateData);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error('A supply with that SKU already exists');
      throw error;
    }
    return item;
  },

  deleteItem: async (itemId: string) => {
    const item = await SupplyItem.findByPk(itemId);
    if (!item) throw new Error('Supply item not found');
    if (item.on_hand > 0) throw new Error(`Cannot delete item with ${item.on_hand} unit(s) still on hand`);
    await item.destroy();
    return true;
  },

  // ── Stock movements ────────────────────────────────────────────────────────

  /** Receive stock in (increments on_hand). */
  receiveStock: async (itemId: string, quantity: number, performedBy: string, tenantId: string, reason?: string) => {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be a positive integer');
    return supplyService._move(itemId, quantity, SupplyMovementType.RECEIPT, performedBy, tenantId, { reason });
  },

  /** Issue stock out to a department (decrements on_hand; guards against going negative). */
  issueStock: async (itemId: string, quantity: number, performedBy: string, tenantId: string, opts?: { department_id?: string; reason?: string }) => {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be a positive integer');
    if (opts?.department_id && !ValidationUtil.isValidUUID(opts.department_id)) throw new Error('Invalid department ID format');
    return supplyService._move(itemId, -quantity, SupplyMovementType.ISSUE, performedBy, tenantId, opts);
  },

  /** Manual signed correction. */
  adjustStock: async (itemId: string, delta: number, reason: string, performedBy: string, tenantId: string) => {
    if (!Number.isInteger(delta) || delta === 0) throw new Error('delta must be a non-zero integer');
    if (!reason || !reason.trim()) throw new Error('reason is required for an adjustment');
    return supplyService._move(itemId, delta, SupplyMovementType.ADJUSTMENT, performedBy, tenantId, { reason });
  },

  /** Write off damaged/expired stock. */
  recordWastage: async (itemId: string, quantity: number, reason: string, performedBy: string, tenantId: string) => {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be a positive integer');
    if (!reason || !reason.trim()) throw new Error('reason is required for wastage');
    return supplyService._move(itemId, -quantity, SupplyMovementType.WASTAGE, performedBy, tenantId, { reason });
  },

  /** Apply a signed movement transactionally: update on_hand + write the ledger row. */
  _move: async (
    itemId: string,
    signedQty: number,
    type: SupplyMovementType,
    performedBy: string,
    tenantId: string,
    opts?: { department_id?: string; reason?: string }
  ) => {
    const sequelize = SupplyItem.sequelize!;
    return sequelize.transaction(async (transaction) => {
      const item = await SupplyItem.findByPk(itemId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!item) throw new Error('Supply item not found');
      if (item.tenant_id !== tenantId) throw new Error('Item does not belong to this tenant');

      const next = item.on_hand + signedQty;
      if (next < 0) throw new Error(`Insufficient stock: ${item.on_hand} on hand, ${Math.abs(signedQty)} requested`);

      await item.update({ on_hand: next }, { transaction });
      const movement = await SupplyMovement.create({
        supply_item_id: itemId,
        movement_type: type,
        quantity: signedQty,
        balance_after: next,
        department_id: opts?.department_id || null,
        reason: opts?.reason || null,
        performed_by: performedBy,
        tenant_id: tenantId
      } as any, { transaction });

      return { item, movement, on_hand: next };
    });
  },

  getLowStockItems: async (tenantId: string) => {
    const sequelize = SupplyItem.sequelize!;
    const items = await SupplyItem.findAll({
      where: {
        tenant_id: tenantId,
        is_active: true,
        [Op.and]: [sequelize.literal('on_hand <= reorder_level')]
      } as any,
      order: [['on_hand', 'ASC']]
    });
    return items.map(i => ({ id: i.id, name: i.name, sku: i.sku, on_hand: i.on_hand, reorder_level: i.reorder_level }));
  },

  getMovements: async (tenantId: string, paginationQuery: PaginationQuery, filters: { item_id?: string; movement_type?: SupplyMovementType } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.item_id) where.supply_item_id = filters.item_id;
    if (filters.movement_type) where.movement_type = filters.movement_type;

    const { count, rows: movements } = await SupplyMovement.findAndCountAll({
      where,
      include: [{ model: SupplyItem, as: 'item', attributes: ['id', 'name', 'sku'] }],
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions)
    });
    return { movements, count, page: paginationOptions.page, limit: paginationOptions.limit };
  }
};
