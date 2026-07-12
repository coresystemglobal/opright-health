import { Request, Response } from 'express';
import { supplyService } from '@modules/supplies/supply.service';
import { equipmentService } from '@modules/supplies/equipment.service';
import { SupplyMovementType } from '@modules/supplies/supply-movement.model';
import { EquipmentCategory, EquipmentStatus } from '@modules/supplies/equipment.model';
import { SupplyCategory } from '@modules/supplies/supply-item.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('Insufficient') || msg.includes('Cannot delete')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be') || msg.includes('does not belong') || msg.includes('cannot')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const suppliesController = {
  // ── Supply items ────────────────────────────────────────────────────────────
  createItem: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const item = await supplyService.createItem({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, item, 'Supply item created successfully', 201);
    } catch (e) { return fail(res, e, 'create supply item'); }
  },
  listItems: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { q, category, is_active } = req.query as Record<string, string>;
      const r = await supplyService.listItems(tenantId, paged(req), { q, category: category as SupplyCategory, is_active: is_active === undefined ? undefined : is_active === 'true' });
      return ResponseUtil.paginated(res, r.items, r.count, r.page, r.limit, 'Supply items retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve supply items'); }
  },
  getItem: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await supplyService.getItemById(req.params.id), 'Supply item retrieved successfully'); }
    catch (e) { return fail(res, e, 'retrieve supply item'); }
  },
  updateItem: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await supplyService.updateItem(req.params.id, req.body), 'Supply item updated successfully'); }
    catch (e) { return fail(res, e, 'update supply item'); }
  },
  deleteItem: async (req: Request, res: Response): Promise<Response> => {
    try { await supplyService.deleteItem(req.params.id); return ResponseUtil.success(res, null, 'Supply item deleted successfully'); }
    catch (e) { return fail(res, e, 'delete supply item'); }
  },

  // ── Stock movements ────────────────────────────────────────────────────────
  receive: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const result = await supplyService.receiveStock(req.params.id, req.body.quantity, userId, tenantId, req.body.reason);
      return ResponseUtil.success(res, result, 'Stock received successfully', 201);
    } catch (e) { return fail(res, e, 'receive stock'); }
  },
  issue: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const { quantity, department_id, reason } = req.body;
      const result = await supplyService.issueStock(req.params.id, quantity, userId, tenantId, { department_id, reason });
      return ResponseUtil.success(res, result, 'Stock issued successfully');
    } catch (e) { return fail(res, e, 'issue stock'); }
  },
  adjust: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const result = await supplyService.adjustStock(req.params.id, req.body.delta, req.body.reason, userId, tenantId);
      return ResponseUtil.success(res, result, 'Stock adjusted successfully');
    } catch (e) { return fail(res, e, 'adjust stock'); }
  },
  wastage: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req); const userId = userOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!userId) return ResponseUtil.unauthorized(res);
      const result = await supplyService.recordWastage(req.params.id, req.body.quantity, req.body.reason, userId, tenantId);
      return ResponseUtil.success(res, result, 'Wastage recorded successfully');
    } catch (e) { return fail(res, e, 'record wastage'); }
  },
  lowStock: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await supplyService.getLowStockItems(tenantId), 'Low-stock supplies retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve low-stock supplies'); }
  },
  movements: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { item_id, movement_type } = req.query as Record<string, string>;
      const r = await supplyService.getMovements(tenantId, paged(req), { item_id, movement_type: movement_type as SupplyMovementType });
      return ResponseUtil.paginated(res, r.movements, r.count, r.page, r.limit, 'Supply movements retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve movements'); }
  },

  // ── Equipment ────────────────────────────────────────────────────────────────
  createEquipment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const equipment = await equipmentService.createEquipment({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, equipment, 'Equipment created successfully', 201);
    } catch (e) { return fail(res, e, 'create equipment'); }
  },
  listEquipment: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { q, category, status, department_id } = req.query as Record<string, string>;
      const r = await equipmentService.listEquipment(tenantId, paged(req), { q, category: category as EquipmentCategory, status: status as EquipmentStatus, department_id });
      return ResponseUtil.paginated(res, r.equipment, r.count, r.page, r.limit, 'Equipment retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve equipment'); }
  },
  getEquipment: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await equipmentService.getEquipmentById(req.params.id), 'Equipment retrieved successfully'); }
    catch (e) { return fail(res, e, 'retrieve equipment'); }
  },
  updateEquipment: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await equipmentService.updateEquipment(req.params.id, req.body), 'Equipment updated successfully'); }
    catch (e) { return fail(res, e, 'update equipment'); }
  },
  changeEquipmentStatus: async (req: Request, res: Response): Promise<Response> => {
    try { return ResponseUtil.success(res, await equipmentService.changeStatus(req.params.id, req.body.status), 'Equipment status updated successfully'); }
    catch (e) { return fail(res, e, 'change equipment status'); }
  },
  recordMaintenance: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { next_maintenance_at, notes, return_to_available } = req.body;
      const equipment = await equipmentService.recordMaintenance(req.params.id, { next_maintenance_at, notes, return_to_available });
      return ResponseUtil.success(res, equipment, 'Maintenance recorded successfully');
    } catch (e) { return fail(res, e, 'record maintenance'); }
  },
  deleteEquipment: async (req: Request, res: Response): Promise<Response> => {
    try { await equipmentService.deleteEquipment(req.params.id); return ResponseUtil.success(res, null, 'Equipment deleted successfully'); }
    catch (e) { return fail(res, e, 'delete equipment'); }
  },
  maintenanceDue: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await equipmentService.getMaintenanceDue(tenantId), 'Maintenance-due equipment retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve maintenance-due equipment'); }
  }
};

export default suppliesController;
