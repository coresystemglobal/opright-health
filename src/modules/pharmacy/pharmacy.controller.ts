import { Request, Response } from 'express';
import { pharmacyItemService } from '@modules/pharmacy/pharmacy-item.service';
import { stockService } from '@modules/pharmacy/stock.service';
import { MovementType } from '@modules/pharmacy/stock-movement.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('Insufficient') || msg.includes('Cannot delete') || msg.includes('negative')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be') || msg.includes('does not belong')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const pharmacyController = {
  // ── Items ────────────────────────────────────────────────────────────────
  createItem: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const item = await pharmacyItemService.createItem({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, item, 'Pharmacy item created successfully', 201);
    } catch (e) { return fail(res, e, 'create item'); }
  },

  listItems: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { q, category, is_active } = req.query as Record<string, string>;
      const result = await pharmacyItemService.listItems(tenantId, paged(req), {
        q, category, is_active: is_active === undefined ? undefined : is_active === 'true'
      });
      return ResponseUtil.paginated(res, result.items, result.count, result.page, result.limit, 'Pharmacy items retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve items'); }
  },

  getItem: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await pharmacyItemService.getItemById(req.params.id);
      return ResponseUtil.success(res, data, 'Pharmacy item retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve item'); }
  },

  updateItem: async (req: Request, res: Response): Promise<Response> => {
    try {
      const item = await pharmacyItemService.updateItem(req.params.id, req.body);
      return ResponseUtil.success(res, item, 'Pharmacy item updated successfully');
    } catch (e) { return fail(res, e, 'update item'); }
  },

  deleteItem: async (req: Request, res: Response): Promise<Response> => {
    try {
      await pharmacyItemService.deleteItem(req.params.id);
      return ResponseUtil.success(res, null, 'Pharmacy item deleted successfully');
    } catch (e) { return fail(res, e, 'delete item'); }
  },

  // ── Stock ──────────────────────────────────────────────────────────────────
  receiveStock: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const result = await stockService.receiveStock(req.params.id, req.body, userId, tenantId);
      return ResponseUtil.success(res, result, 'Stock received successfully', 201);
    } catch (e) { return fail(res, e, 'receive stock'); }
  },

  dispenseStock: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const { quantity, reference_type, reference_id, reason } = req.body;
      const result = await stockService.dispenseStock(req.params.id, quantity, userId, tenantId, { reference_type, reference_id, reason });
      return ResponseUtil.success(res, result, 'Stock dispensed successfully');
    } catch (e) { return fail(res, e, 'dispense stock'); }
  },

  adjustStock: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const { delta, reason } = req.body;
      const result = await stockService.adjustStock(req.params.batchId, delta, reason, userId, tenantId);
      return ResponseUtil.success(res, result, 'Stock adjusted successfully');
    } catch (e) { return fail(res, e, 'adjust stock'); }
  },

  getStockLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await stockService.getStockLevel(req.params.id);
      return ResponseUtil.success(res, data, 'Stock level retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve stock level'); }
  },

  lowStock: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const items = await stockService.getLowStockItems(tenantId);
      return ResponseUtil.success(res, items, 'Low-stock items retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve low-stock items'); }
  },

  expiring: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const batches = await stockService.getExpiringBatches(tenantId, isNaN(days) ? 30 : days);
      return ResponseUtil.success(res, batches, 'Expiring batches retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve expiring batches'); }
  },

  movements: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { item_id, movement_type } = req.query as Record<string, string>;
      const result = await stockService.getMovements(tenantId, paged(req), { item_id, movement_type: movement_type as MovementType });
      return ResponseUtil.paginated(res, result.movements, result.count, result.page, result.limit, 'Stock movements retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve movements'); }
  }
};

export default pharmacyController;
