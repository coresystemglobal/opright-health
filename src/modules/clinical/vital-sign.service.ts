import { Op } from 'sequelize';
import { VitalSign, Patient, User } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateVitalSignData {
  patient_id: string;
  appointment_id?: string;
  temperature?: number;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  height?: number;
  weight?: number;
  blood_glucose?: number;
  notes?: string;
  recorded_at?: Date;
  recorded_by: string;
  tenant_id: string;
}

interface UpdateVitalSignData {
  temperature?: number;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  height?: number;
  weight?: number;
  blood_glucose?: number;
  notes?: string;
}

// Metrics that can be charted over time
const TREND_METRICS = [
  'temperature',
  'heart_rate',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'respiratory_rate',
  'oxygen_saturation',
  'weight',
  'bmi',
  'blood_glucose'
] as const;

type TrendMetric = typeof TREND_METRICS[number];

const recorderInclude = {
  model: User,
  as: 'recorder',
  attributes: ['id', 'first_name', 'last_name']
};

// Derive BMI from height (cm) and weight (kg) when both are present
function deriveBmi(height?: number, weight?: number): number | null {
  if (!height || !weight) return null;
  const heightMeters = height / 100;
  return parseFloat((weight / (heightMeters * heightMeters)).toFixed(2));
}

export const vitalSignService = {
  recordVitalSign: async (data: CreateVitalSignData) => {
    try {
      const { patient_id, recorded_by, tenant_id } = data;

      if (!patient_id || !recorded_by || !tenant_id) {
        throw new Error('patient_id and tenant context are required');
      }

      for (const id of [patient_id, recorded_by, tenant_id]) {
        if (!ValidationUtil.isValidUUID(id)) {
          throw new Error(`Invalid UUID format: ${id}`);
        }
      }
      if (data.appointment_id && !ValidationUtil.isValidUUID(data.appointment_id)) {
        throw new Error('Invalid appointment ID format');
      }

      const bmi = deriveBmi(data.height, data.weight);

      const vital = await VitalSign.create({
        patient_id,
        appointment_id: data.appointment_id || null,
        temperature: data.temperature ?? null,
        heart_rate: data.heart_rate ?? null,
        blood_pressure_systolic: data.blood_pressure_systolic ?? null,
        blood_pressure_diastolic: data.blood_pressure_diastolic ?? null,
        respiratory_rate: data.respiratory_rate ?? null,
        oxygen_saturation: data.oxygen_saturation ?? null,
        height: data.height ?? null,
        weight: data.weight ?? null,
        bmi: bmi ?? null,
        blood_glucose: data.blood_glucose ?? null,
        notes: data.notes || null,
        recorded_at: data.recorded_at || new Date(),
        recorded_by,
        tenant_id
      } as any);

      return vital;
    } catch (error) {
      console.error('Record vital sign error:', error);
      throw error;
    }
  },

  getPatientVitalSigns: async (patientId: string, paginationQuery: PaginationQuery) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      const { count, rows: vitals } = await VitalSign.findAndCountAll({
        where: { patient_id: patientId },
        include: [recorderInclude],
        order: [['recorded_at', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions)
      });

      return { vitals, count, page: paginationOptions.page, limit: paginationOptions.limit };
    } catch (error) {
      console.error('Get patient vital signs error:', error);
      throw error;
    }
  },

  getLatestVitalSign: async (patientId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const vital = await VitalSign.findOne({
        where: { patient_id: patientId },
        include: [recorderInclude],
        order: [['recorded_at', 'DESC']]
      });

      return vital; // may be null if none recorded yet
    } catch (error) {
      console.error('Get latest vital sign error:', error);
      throw error;
    }
  },

  getVitalSignById: async (vitalId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(vitalId)) {
        throw new Error('Invalid vital sign ID format');
      }

      const vital = await VitalSign.findByPk(vitalId, {
        include: [
          { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'] },
          recorderInclude
        ]
      });

      if (!vital) {
        throw new Error('Vital sign record not found');
      }

      return vital;
    } catch (error) {
      console.error('Get vital sign by ID error:', error);
      throw error;
    }
  },

  /**
   * Time-series of one or more vital-sign metrics for charting.
   * Returns ascending-by-time points per requested metric, plus the
   * blood-pressure pair as a convenience series.
   */
  getTrends: async (
    patientId: string,
    opts: { metrics?: string[]; startDate?: Date; endDate?: Date }
  ) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      // Default: all trendable metrics; otherwise validate the requested subset
      const requested = (opts.metrics && opts.metrics.length > 0)
        ? opts.metrics.filter((m): m is TrendMetric => (TREND_METRICS as readonly string[]).includes(m))
        : [...TREND_METRICS];

      if (requested.length === 0) {
        throw new Error(`No valid metrics requested. Valid metrics: ${TREND_METRICS.join(', ')}`);
      }

      const where: any = { patient_id: patientId };
      if (opts.startDate || opts.endDate) {
        where.recorded_at = {};
        if (opts.startDate) where.recorded_at[Op.gte] = opts.startDate;
        if (opts.endDate) where.recorded_at[Op.lte] = opts.endDate;
      }

      const records = await VitalSign.findAll({
        where,
        attributes: ['id', 'recorded_at', ...requested],
        order: [['recorded_at', 'ASC']],
        raw: true
      });

      // Build one series per metric, dropping points where the metric is null
      const series: Record<string, { recorded_at: Date; value: number }[]> = {};
      for (const metric of requested) {
        series[metric] = records
          .filter((r: any) => r[metric] !== null && r[metric] !== undefined)
          .map((r: any) => ({ recorded_at: r.recorded_at, value: parseFloat(r[metric]) }));
      }

      return {
        patient_id: patientId,
        metrics: requested,
        range: {
          startDate: opts.startDate ? opts.startDate.toISOString() : null,
          endDate: opts.endDate ? opts.endDate.toISOString() : null
        },
        count: records.length,
        series
      };
    } catch (error) {
      console.error('Get vital sign trends error:', error);
      throw error;
    }
  },

  updateVitalSign: async (vitalId: string, updateData: UpdateVitalSignData) => {
    try {
      if (!ValidationUtil.isValidUUID(vitalId)) {
        throw new Error('Invalid vital sign ID format');
      }

      const vital = await VitalSign.findByPk(vitalId);

      if (!vital) {
        throw new Error('Vital sign record not found');
      }

      // Recompute BMI when height or weight changes
      const nextHeight = updateData.height ?? vital.height;
      const nextWeight = updateData.weight ?? vital.weight;
      const payload: any = { ...updateData };
      if (updateData.height !== undefined || updateData.weight !== undefined) {
        payload.bmi = deriveBmi(nextHeight, nextWeight);
      }

      await vital.update(payload);
      return vital;
    } catch (error) {
      console.error('Update vital sign error:', error);
      throw error;
    }
  },

  deleteVitalSign: async (vitalId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(vitalId)) {
        throw new Error('Invalid vital sign ID format');
      }

      const vital = await VitalSign.findByPk(vitalId);

      if (!vital) {
        throw new Error('Vital sign record not found');
      }

      await vital.destroy();
      return true;
    } catch (error) {
      console.error('Delete vital sign error:', error);
      throw error;
    }
  }
};
