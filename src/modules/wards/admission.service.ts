import { Admission, Bed, Ward, Patient, Doctor, User } from '../../models';
import { AdmissionStatus } from '@modules/wards/admission.model';
import { BedStatus, ASSIGNABLE_BED_STATUSES } from '@modules/wards/bed.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface AdmitData {
  patient_id: string;
  ward_id: string;
  bed_id: string;
  admitting_doctor_id?: string;
  reason?: string;
  expected_discharge_at?: Date;
  created_by: string;
  tenant_id: string;
}

const admissionIncludes = [
  { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'] },
  { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] },
  { model: Bed, as: 'bed', attributes: ['id', 'bed_number', 'status'] },
  { model: Doctor, as: 'admitting_doctor', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }] }
];

function generateAdmissionNumber(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  return `ADM-${t}${r}`;
}

export const admissionService = {
  /** Admit a patient to a bed. Transactionally marks the bed OCCUPIED. */
  admitPatient: async (data: AdmitData) => {
    const { patient_id, ward_id, bed_id, created_by, tenant_id } = data;
    if (!patient_id || !ward_id || !bed_id || !created_by || !tenant_id) {
      throw new Error('patient_id, ward_id, bed_id, and tenant context are required');
    }
    for (const id of [patient_id, ward_id, bed_id, created_by, tenant_id]) {
      if (!ValidationUtil.isValidUUID(id)) throw new Error(`Invalid UUID format: ${id}`);
    }
    if (data.admitting_doctor_id && !ValidationUtil.isValidUUID(data.admitting_doctor_id)) {
      throw new Error('Invalid admitting doctor ID format');
    }

    // Patient may not hold two active admissions
    const existing = await Admission.findOne({ where: { patient_id, status: AdmissionStatus.ADMITTED } });
    if (existing) throw new Error('Patient already has an active admission');

    const bed = await Bed.findByPk(bed_id);
    if (!bed) throw new Error('Bed not found');
    if (bed.ward_id !== ward_id) throw new Error('Bed does not belong to the specified ward');
    if (bed.tenant_id !== tenant_id) throw new Error('Bed does not belong to this tenant');
    if (!bed.is_active || !ASSIGNABLE_BED_STATUSES.includes(bed.status)) {
      throw new Error(`Bed is not available for admission (status: ${bed.status})`);
    }

    const sequelize = Admission.sequelize!;
    return sequelize.transaction(async (transaction) => {
      const admission = await Admission.create({
        admission_number: generateAdmissionNumber(),
        patient_id,
        ward_id,
        bed_id,
        admitting_doctor_id: data.admitting_doctor_id || null,
        status: AdmissionStatus.ADMITTED,
        reason: data.reason || null,
        admitted_at: new Date(),
        expected_discharge_at: data.expected_discharge_at || null,
        created_by,
        tenant_id
      } as any, { transaction });

      await bed.update({ status: BedStatus.OCCUPIED }, { transaction });

      return Admission.findByPk(admission.id, { include: admissionIncludes, transaction });
    });
  },

  /** Move an admitted patient to a different bed. Frees the old bed, occupies the new. */
  transferPatient: async (admissionId: string, newBedId: string) => {
    if (!ValidationUtil.isValidUUID(admissionId)) throw new Error('Invalid admission ID format');
    if (!ValidationUtil.isValidUUID(newBedId)) throw new Error('Invalid bed ID format');

    const admission = await Admission.findByPk(admissionId);
    if (!admission) throw new Error('Admission not found');
    if (admission.status !== AdmissionStatus.ADMITTED) {
      throw new Error('Only an active admission can be transferred');
    }
    if (admission.bed_id === newBedId) throw new Error('Patient is already in that bed');

    const newBed = await Bed.findByPk(newBedId);
    if (!newBed) throw new Error('Target bed not found');
    if (newBed.tenant_id !== admission.tenant_id) throw new Error('Target bed does not belong to this tenant');
    if (!newBed.is_active || !ASSIGNABLE_BED_STATUSES.includes(newBed.status)) {
      throw new Error(`Target bed is not available (status: ${newBed.status})`);
    }

    const sequelize = Admission.sequelize!;
    return sequelize.transaction(async (transaction) => {
      // Free the old bed (turnover cleaning) if one is assigned
      if (admission.bed_id) {
        const oldBed = await Bed.findByPk(admission.bed_id, { transaction });
        if (oldBed) await oldBed.update({ status: BedStatus.CLEANING }, { transaction });
      }

      await newBed.update({ status: BedStatus.OCCUPIED }, { transaction });
      await admission.update({ bed_id: newBed.id, ward_id: newBed.ward_id }, { transaction });

      return Admission.findByPk(admission.id, { include: admissionIncludes, transaction });
    });
  },

  /** Discharge a patient. Frees the bed (→ cleaning) and closes the admission. */
  dischargePatient: async (admissionId: string, notes?: string) => {
    if (!ValidationUtil.isValidUUID(admissionId)) throw new Error('Invalid admission ID format');

    const admission = await Admission.findByPk(admissionId);
    if (!admission) throw new Error('Admission not found');
    if (admission.status !== AdmissionStatus.ADMITTED) {
      throw new Error('Admission is not active');
    }

    const sequelize = Admission.sequelize!;
    return sequelize.transaction(async (transaction) => {
      if (admission.bed_id) {
        const bed = await Bed.findByPk(admission.bed_id, { transaction });
        if (bed) await bed.update({ status: BedStatus.CLEANING }, { transaction });
      }

      // bed_id is retained for history; the bed's status reflects that it's free
      await admission.update({
        status: AdmissionStatus.DISCHARGED,
        discharged_at: new Date(),
        discharge_notes: notes || null
      }, { transaction });

      return Admission.findByPk(admission.id, { include: admissionIncludes, transaction });
    });
  },

  getActiveAdmissions: async (tenantId: string, paginationQuery: PaginationQuery, wardId?: string) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId, status: AdmissionStatus.ADMITTED };
    if (wardId) where.ward_id = wardId;

    const { count, rows: admissions } = await Admission.findAndCountAll({
      where,
      include: admissionIncludes,
      order: [['admitted_at', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      distinct: true
    });
    return { admissions, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getPatientAdmissions: async (patientId: string, paginationQuery: PaginationQuery) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

    const { count, rows: admissions } = await Admission.findAndCountAll({
      where: { patient_id: patientId },
      include: admissionIncludes,
      order: [['admitted_at', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      distinct: true,
      paranoid: true
    });
    return { admissions, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getAdmissionById: async (admissionId: string) => {
    if (!ValidationUtil.isValidUUID(admissionId)) throw new Error('Invalid admission ID format');
    const admission = await Admission.findByPk(admissionId, { include: admissionIncludes });
    if (!admission) throw new Error('Admission not found');
    return admission;
  }
};
