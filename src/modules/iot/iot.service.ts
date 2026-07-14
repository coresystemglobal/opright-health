import { Op } from 'sequelize';
import { IoTDevice, DeviceReading } from '../../models';
import { DeviceType, DeviceStatus } from '@modules/iot/iot-device.model';
import { NotificationService, NotificationType } from '@modules/notifications/notification.service';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface RegisterDeviceData {
  external_device_id: string;
  name: string;
  device_type?: DeviceType;
  location?: string;
  status?: DeviceStatus;
  thresholds?: Record<string, { min?: number; max?: number }>;
  assigned_patient_id?: string;
  tenant_id: string;
}

interface IngestData {
  metrics: Record<string, any>;
  patient_id?: string;
  recorded_at?: string | Date;
}

/** Compare a reading's metrics against a device's thresholds. */
export function evaluateThresholds(
  metrics: Record<string, any>,
  thresholds?: Record<string, { min?: number; max?: number }>
): string[] {
  if (!thresholds) return [];
  const alerts: string[] = [];
  for (const [metric, bound] of Object.entries(thresholds)) {
    const value = metrics[metric];
    if (typeof value !== 'number' || !bound) continue;
    if (bound.min != null && value < bound.min) alerts.push(`${metric} low: ${value} (min ${bound.min})`);
    else if (bound.max != null && value > bound.max) alerts.push(`${metric} high: ${value} (max ${bound.max})`);
  }
  return alerts;
}

async function assertDevice(deviceId: string, tenantId: string): Promise<IoTDevice> {
  if (!ValidationUtil.isValidUUID(deviceId)) throw new Error('Invalid device ID format');
  const device = await IoTDevice.findByPk(deviceId);
  if (!device || device.tenant_id !== tenantId) throw new Error('Device not found');
  return device;
}

export const iotDeviceService = {
  registerDevice: async (data: RegisterDeviceData) => {
    const { external_device_id, name, tenant_id } = data;
    if (!external_device_id || !name || !tenant_id) throw new Error('external_device_id, name, and tenant context are required');
    try {
      return await IoTDevice.create({
        external_device_id,
        name,
        device_type: data.device_type || DeviceType.VITAL_MONITOR,
        location: data.location || null,
        status: data.status || DeviceStatus.ACTIVE,
        thresholds: data.thresholds || null,
        assigned_patient_id: data.assigned_patient_id || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error(`A device with external ID '${external_device_id}' already exists`);
      throw error;
    }
  },

  listDevices: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { q?: string; device_type?: DeviceType; status?: DeviceStatus; assigned_patient_id?: string } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.device_type) where.device_type = filters.device_type;
    if (filters.status) where.status = filters.status;
    if (filters.assigned_patient_id) where.assigned_patient_id = filters.assigned_patient_id;
    if (filters.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.q}%` } },
        { external_device_id: { [Op.iLike]: `%${filters.q}%` } }
      ];
    }
    const { count, rows: devices } = await IoTDevice.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { devices, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getDeviceById: async (deviceId: string, tenantId: string) => assertDevice(deviceId, tenantId),

  updateDevice: async (deviceId: string, tenantId: string, update: Partial<RegisterDeviceData>) => {
    const device = await assertDevice(deviceId, tenantId);
    const patch: any = { ...update };
    delete patch.tenant_id;
    delete patch.external_device_id; // immutable hardware key
    try {
      await device.update(patch);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error('A device with that external ID already exists');
      throw error;
    }
    return device;
  },

  deleteDevice: async (deviceId: string, tenantId: string) => {
    const device = await assertDevice(deviceId, tenantId);
    await device.destroy();
    return true;
  },

  /**
   * Ingest a reading: evaluate thresholds, persist the reading, bump the
   * device's last_seen_at, and fire a best-effort alert when abnormal.
   */
  ingestReading: async (deviceId: string, tenantId: string, data: IngestData) => {
    const device = await assertDevice(deviceId, tenantId);
    if (!data.metrics || typeof data.metrics !== 'object' || Object.keys(data.metrics).length === 0) {
      throw new Error('metrics are required');
    }
    const recordedAt = data.recorded_at ? new Date(data.recorded_at) : new Date();
    const alerts = evaluateThresholds(data.metrics, device.thresholds);
    const isAbnormal = alerts.length > 0;
    const patientId = data.patient_id || device.assigned_patient_id || null;

    const reading = await DeviceReading.create({
      device_id: device.id,
      patient_id: patientId,
      metrics: data.metrics,
      alerts: isAbnormal ? alerts : null,
      is_abnormal: isAbnormal,
      recorded_at: recordedAt,
      tenant_id: tenantId
    } as any);

    await device.update({ last_seen_at: recordedAt });

    if (isAbnormal) {
      try {
        await NotificationService.sendNotification({
          type: NotificationType.EMERGENCY,
          title: 'Abnormal device reading',
          message: `${device.name} (${device.device_type}): ${alerts.join('; ')}`,
          tenantId,
          data: { deviceId: device.id, readingId: reading.id, patientId, alerts, metrics: data.metrics }
        });
      } catch { /* alerting is best-effort */ }
    }

    return reading;
  },

  listReadings: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { device_id?: string; patient_id?: string; is_abnormal?: boolean; from?: string; to?: string } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.device_id) where.device_id = filters.device_id;
    if (filters.patient_id) where.patient_id = filters.patient_id;
    if (filters.is_abnormal !== undefined) where.is_abnormal = filters.is_abnormal;
    if (filters.from || filters.to) {
      where.recorded_at = {};
      if (filters.from) where.recorded_at[Op.gte] = new Date(filters.from);
      if (filters.to) where.recorded_at[Op.lte] = new Date(filters.to);
    }
    const { count, rows: readings } = await DeviceReading.findAndCountAll({
      where,
      include: [{ model: IoTDevice, attributes: ['id', 'name', 'device_type'] }],
      order: [['recorded_at', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions)
    });
    return { readings, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  /** Most recent readings for a patient across all their devices. */
  getPatientReadings: async (patientId: string, tenantId: string, limit = 50) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    return DeviceReading.findAll({
      where: { tenant_id: tenantId, patient_id: patientId },
      include: [{ model: IoTDevice, attributes: ['id', 'name', 'device_type'] }],
      order: [['recorded_at', 'DESC']],
      limit: Math.min(Math.max(limit, 1), 200)
    });
  }
};
