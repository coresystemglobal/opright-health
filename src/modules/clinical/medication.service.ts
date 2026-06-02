import { Medication, Patient, Doctor, User } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { MedicationRoute, MedicationFrequency } from '@modules/clinical/medication.model';


interface CreateMedicationData {
  patient_id: string;
  medication_name: string;
  dosage: string;
  strength?: string;
  route?: MedicationRoute;
  frequency: MedicationFrequency;
  instructions?: string;
  start_date: Date;
  end_date?: Date;
  reason?: string;
  side_effects?: string;
  notes?: string;
  prescribing_doctor_id: string;
  recorded_by: string;
  tenant_id: string;
}

interface UpdateMedicationData {
  medication_name?: string;
  dosage?: string;
  strength?: string;
  route?: MedicationRoute;
  frequency?: MedicationFrequency;
  instructions?: string;
  end_date?: Date;
  is_active?: boolean;
  reason?: string;
  side_effects?: string;
  notes?: string;
}

export const medicationService = {
  createMedication: async (data: CreateMedicationData) => {
    try {
      const { patient_id, prescribing_doctor_id, recorded_by, tenant_id, medication_name, dosage, frequency, start_date } = data;

      if (!patient_id || !prescribing_doctor_id || !recorded_by || !tenant_id || !medication_name || !dosage || !frequency || !start_date) {
        throw new Error('patient_id, prescribing_doctor_id, medication_name, dosage, frequency, and start_date are required');
      }

      for (const id of [patient_id, prescribing_doctor_id, recorded_by, tenant_id]) {
        if (!ValidationUtil.isValidUUID(id)) {
          throw new Error(`Invalid UUID format: ${id}`);
        }
      }

      const medication = await Medication.create({
        patient_id,
        medication_name,
        dosage,
        strength: data.strength || null,
        route: data.route || MedicationRoute.ORAL,
        frequency,
        instructions: data.instructions || null,
        start_date,
        end_date: data.end_date || null,
        is_active: true,
        reason: data.reason || null,
        side_effects: data.side_effects || null,
        notes: data.notes || null,
        prescribing_doctor_id,
        recorded_by,
        tenant_id
      } as any);

      return medication;
    } catch (error) {
      console.error('Create medication error:', error);
      throw error;
    }
  },

  getPatientMedications: async (patientId: string, paginationQuery: PaginationQuery, isActive?: boolean) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
      const whereConditions: any = { patient_id: patientId };

      if (isActive !== undefined) {
        whereConditions.is_active = isActive;
      }

      const { count, rows: medications } = await Medication.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Doctor,
            as: 'prescribing_doctor',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }]
          }
        ],
        order: [['start_date', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return { medications, count, page: paginationOptions.page, limit: paginationOptions.limit };
    } catch (error) {
      console.error('Get patient medications error:', error);
      throw error;
    }
  },

  getMedicationById: async (medicationId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(medicationId)) {
        throw new Error('Invalid medication ID format');
      }

      const medication = await Medication.findByPk(medicationId, {
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'mrn']
          },
          {
            model: Doctor,
            as: 'prescribing_doctor',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }]
          }
        ]
      });

      if (!medication) {
        throw new Error('Medication not found');
      }

      return medication;
    } catch (error) {
      console.error('Get medication by ID error:', error);
      throw error;
    }
  },

  updateMedication: async (medicationId: string, updateData: UpdateMedicationData) => {
    try {
      if (!ValidationUtil.isValidUUID(medicationId)) {
        throw new Error('Invalid medication ID format');
      }

      const medication = await Medication.findByPk(medicationId);

      if (!medication) {
        throw new Error('Medication not found');
      }

      await medication.update(updateData);
      return medication;
    } catch (error) {
      console.error('Update medication error:', error);
      throw error;
    }
  },

  deleteMedication: async (medicationId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(medicationId)) {
        throw new Error('Invalid medication ID format');
      }

      const medication = await Medication.findByPk(medicationId);

      if (!medication) {
        throw new Error('Medication not found');
      }

      await medication.destroy();
      return true;
    } catch (error) {
      console.error('Delete medication error:', error);
      throw error;
    }
  },

  getActiveMedications: async (patientId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const medications = await Medication.findAll({
        where: { patient_id: patientId, is_active: true },
        include: [
          {
            model: Doctor,
            as: 'prescribing_doctor',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }]
          }
        ],
        order: [['start_date', 'DESC']],
        paranoid: true
      });

      return medications;
    } catch (error) {
      console.error('Get active medications error:', error);
      throw error;
    }
  }
};
