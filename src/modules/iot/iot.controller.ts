import { Request, Response } from 'express';
import { iotDeviceService } from '@modules/iot/iot.service';
import { DeviceType, DeviceStatus } from '@modules/iot/iot-device.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('already exists')) return ResponseUtil.conflict(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be')) return ResponseUtil.validationError(res, [msg]);
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const iotController = {
  registerDevice: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const device = await iotDeviceService.registerDevice({ ...req.body, tenant_id: tenantId });
      return ResponseUtil.success(res, device, 'Device registered successfully', 201);
    } catch (e) { return fail(res, e, 'register device'); }
  },
  listDevices: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { q, device_type, status, assigned_patient_id } = req.query as Record<string, string>;
      const r = await iotDeviceService.listDevices(tenantId, paged(req), { q, device_type: device_type as DeviceType, status: status as DeviceStatus, assigned_patient_id });
      return ResponseUtil.paginated(res, r.devices, r.count, r.page, r.limit, 'Devices retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve devices'); }
  },
  getDevice: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await iotDeviceService.getDeviceById(req.params.id, tenantId), 'Device retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve device'); }
  },
  updateDevice: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await iotDeviceService.updateDevice(req.params.id, tenantId, req.body), 'Device updated successfully');
    } catch (e) { return fail(res, e, 'update device'); }
  },
  deleteDevice: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      await iotDeviceService.deleteDevice(req.params.id, tenantId);
      return ResponseUtil.success(res, null, 'Device deleted successfully');
    } catch (e) { return fail(res, e, 'delete device'); }
  },
  ingestReading: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { metrics, patient_id, recorded_at } = req.body;
      const reading = await iotDeviceService.ingestReading(req.params.id, tenantId, { metrics, patient_id, recorded_at });
      return ResponseUtil.success(res, reading, reading.is_abnormal ? 'Reading ingested — threshold alert raised' : 'Reading ingested successfully', 201);
    } catch (e) { return fail(res, e, 'ingest reading'); }
  },
  listReadings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { device_id, patient_id, is_abnormal, from, to } = req.query as Record<string, string>;
      const r = await iotDeviceService.listReadings(tenantId, paged(req), {
        device_id, patient_id, is_abnormal: is_abnormal === undefined ? undefined : is_abnormal === 'true', from, to
      });
      return ResponseUtil.paginated(res, r.readings, r.count, r.page, r.limit, 'Readings retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve readings'); }
  },
  patientReadings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      return ResponseUtil.success(res, await iotDeviceService.getPatientReadings(req.params.patientId, tenantId, limit), 'Patient readings retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve patient readings'); }
  }
};

export default iotController;
