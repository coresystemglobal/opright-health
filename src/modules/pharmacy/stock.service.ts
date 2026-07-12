import { Op, Transaction } from 'sequelize';
import { PharmacyItem, StockBatch, StockMovement } from '../../models';
import { MovementType } from '@modules/pharmacy/stock-movement.model';
import { itemStockTotal } from '@modules/pharmacy/pharmacy-item.service';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface ReceiveData {
  batch_number: string;
  quantity: number;
  expiry_date?: string;
  cost_price?: number;
  supplier?: string;
}

async function assertItem(itemId: string, tenantId: string) {
  if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
  const item = await PharmacyItem.findByPk(itemId);
  if (!item) throw new Error('Pharmacy item not found');
  if (item.tenant_id !== tenantId) throw new Error('Item does not belong to this tenant');
  return item;
}

export const stockService = {
  /** Receive stock into a batch (creating it or topping it up). */
  receiveStock: async (itemId: string, data: ReceiveData, performedBy: string, tenantId: string) => {
    await assertItem(itemId, tenantId);
    if (!data.batch_number) throw new Error('batch_number is required');
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) throw new Error('quantity must be a positive integer');

    const sequelize = StockBatch.sequelize!;
    return sequelize.transaction(async (transaction) => {
      let batch = await StockBatch.findOne({ where: { pharmacy_item_id: itemId, batch_number: data.batch_number }, transaction });
      if (batch) {
        await batch.update({ quantity: batch.quantity + data.quantity }, { transaction });
      } else {
        batch = await StockBatch.create({
          pharmacy_item_id: itemId,
          batch_number: data.batch_number,
          quantity: data.quantity,
          expiry_date: data.expiry_date || null,
          cost_price: data.cost_price ?? null,
          supplier: data.supplier || null,
          received_at: new Date(),
          tenant_id: tenantId
        } as any, { transaction });
      }

      const balance = await itemStockTotal(itemId);
      await StockMovement.create({
        pharmacy_item_id: itemId,
        batch_id: batch.id,
        movement_type: MovementType.RECEIPT,
        quantity: data.quantity,
        balance_after: balance,
        reason: data.supplier ? `Received from ${data.supplier}` : 'Stock received',
        performed_by: performedBy,
        tenant_id: tenantId
      } as any, { transaction });

      return { batch, balance };
    });
  },

  /**
   * Dispense a quantity of an item using FEFO (first-expiry-first-out).
   * Expired batches are skipped. Fails if available (non-expired) stock is
   * insufficient. Records one movement per batch consumed.
   *
   * Pass `externalTransaction` to run within a caller's transaction (e.g. the
   * e-prescription dispense flow) so stock decrement is atomic with it;
   * otherwise a dedicated transaction is used.
   */
  dispenseStock: async (
    itemId: string,
    quantity: number,
    performedBy: string,
    tenantId: string,
    ref?: { reference_type?: string; reference_id?: string; reason?: string },
    externalTransaction?: Transaction
  ) => {
    await assertItem(itemId, tenantId);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be a positive integer');

    const today = new Date().toISOString().split('T')[0];

    const run = async (transaction: Transaction) => {
      // Non-expired batches with stock, earliest expiry first (nulls last)
      const batches = await StockBatch.findAll({
        where: {
          pharmacy_item_id: itemId,
          quantity: { [Op.gt]: 0 },
          [Op.or]: [{ expiry_date: null }, { expiry_date: { [Op.gte]: today } }]
        },
        order: [['expiry_date', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const available = batches.reduce((s, b) => s + b.quantity, 0);
      if (available < quantity) {
        throw new Error(`Insufficient stock: ${available} available, ${quantity} requested`);
      }

      let remaining = quantity;
      let runningBalance = await itemStockTotal(itemId);
      const consumed: Array<{ batch_id: string; batch_number: string; quantity: number }> = [];

      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        await batch.update({ quantity: batch.quantity - take }, { transaction });
        remaining -= take;
        runningBalance -= take;

        await StockMovement.create({
          pharmacy_item_id: itemId,
          batch_id: batch.id,
          movement_type: MovementType.DISPENSE,
          quantity: -take,
          balance_after: runningBalance,
          reason: ref?.reason || 'Dispensed',
          reference_type: ref?.reference_type || null,
          reference_id: ref?.reference_id || null,
          performed_by: performedBy,
          tenant_id: tenantId
        } as any, { transaction });

        consumed.push({ batch_id: batch.id, batch_number: batch.batch_number, quantity: take });
      }

      return { dispensed: quantity, remaining_stock: runningBalance, batches: consumed };
    };

    return externalTransaction ? run(externalTransaction) : StockBatch.sequelize!.transaction(run);
  },

  /** Manual quantity correction on a batch (positive or negative). */
  adjustStock: async (batchId: string, delta: number, reason: string, performedBy: string, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(batchId)) throw new Error('Invalid batch ID format');
    if (!Number.isInteger(delta) || delta === 0) throw new Error('delta must be a non-zero integer');
    if (!reason || !reason.trim()) throw new Error('reason is required for an adjustment');

    const sequelize = StockBatch.sequelize!;
    return sequelize.transaction(async (transaction) => {
      const batch = await StockBatch.findByPk(batchId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!batch) throw new Error('Stock batch not found');
      if (batch.tenant_id !== tenantId) throw new Error('Batch does not belong to this tenant');

      const next = batch.quantity + delta;
      if (next < 0) throw new Error(`Adjustment would make quantity negative (current ${batch.quantity}, delta ${delta})`);

      await batch.update({ quantity: next }, { transaction });
      const balance = await itemStockTotal(batch.pharmacy_item_id);

      await StockMovement.create({
        pharmacy_item_id: batch.pharmacy_item_id,
        batch_id: batch.id,
        movement_type: MovementType.ADJUSTMENT,
        quantity: delta,
        balance_after: balance,
        reason,
        performed_by: performedBy,
        tenant_id: tenantId
      } as any, { transaction });

      return { batch, balance };
    });
  },

  getStockLevel: async (itemId: string) => {
    if (!ValidationUtil.isValidUUID(itemId)) throw new Error('Invalid item ID format');
    const batches = await StockBatch.findAll({
      where: { pharmacy_item_id: itemId },
      order: [['expiry_date', 'ASC']]
    });
    const today = new Date().toISOString().split('T')[0];
    let total = 0, available = 0, expired = 0;
    for (const b of batches) {
      total += b.quantity;
      if (b.expiry_date && b.expiry_date < today) expired += b.quantity;
      else available += b.quantity;
    }
    return { item_id: itemId, total, available, expired, batches };
  },

  /** Items whose total on-hand is at or below their reorder level. */
  getLowStockItems: async (tenantId: string) => {
    const items = await PharmacyItem.findAll({
      where: { tenant_id: tenantId, is_active: true },
      include: [{ model: StockBatch, as: 'batches', attributes: ['quantity'] }]
    });
    return items
      .map((it: any) => {
        const total = (it.batches || []).reduce((s: number, b: any) => s + (b.quantity || 0), 0);
        return { id: it.id, name: it.name, sku: it.sku, reorder_level: it.reorder_level, total_stock: total };
      })
      .filter(r => r.total_stock <= r.reorder_level)
      .sort((a, b) => (a.total_stock - a.reorder_level) - (b.total_stock - b.reorder_level));
  },

  /** Batches expiring within `days` (including already expired) that still hold stock. */
  getExpiringBatches: async (tenantId: string, days = 30) => {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return StockBatch.findAll({
      where: {
        tenant_id: tenantId,
        quantity: { [Op.gt]: 0 },
        expiry_date: { [Op.ne]: null, [Op.lte]: cutoff }
      },
      include: [{ model: PharmacyItem, as: 'item', attributes: ['id', 'name', 'sku'] }],
      order: [['expiry_date', 'ASC']]
    });
  },

  getMovements: async (tenantId: string, paginationQuery: PaginationQuery, filters: { item_id?: string; movement_type?: MovementType } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.item_id) where.pharmacy_item_id = filters.item_id;
    if (filters.movement_type) where.movement_type = filters.movement_type;

    const { count, rows: movements } = await StockMovement.findAndCountAll({
      where,
      include: [{ model: PharmacyItem, as: 'item', attributes: ['id', 'name', 'sku'] }],
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions)
    });
    return { movements, count, page: paginationOptions.page, limit: paginationOptions.limit };
  }
};
