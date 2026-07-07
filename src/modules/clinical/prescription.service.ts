import { Prescription, PrescriptionItem, Patient, Doctor, User } from '../../models';
import { PrescriptionStatus } from '@modules/clinical/prescription.model';
import { MedicationRoute, MedicationFrequency } from '@modules/clinical/medication.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface PrescriptionItemInput {
  medication_name: string;
  dosage: string;
  strength?: string;
  route?: MedicationRoute;
  frequency: MedicationFrequency;
  duration?: string;
  quantity?: number;
  instructions?: string;
}

interface CreatePrescriptionData {
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis?: string;
  notes?: string;
  status?: PrescriptionStatus.DRAFT | PrescriptionStatus.ISSUED;
  items: PrescriptionItemInput[];
  created_by: string;
  tenant_id: string;
}

const itemInclude = { model: PrescriptionItem, as: 'items' };
const doctorInclude = {
  model: Doctor,
  as: 'doctor',
  include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }]
};

/** Generate a unique-ish human-readable prescription number: RX-<base36 time><rand>. */
function generatePrescriptionNumber(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  return `RX-${t}${r}`;
}

export const prescriptionService = {
  createPrescription: async (data: CreatePrescriptionData) => {
    const { patient_id, doctor_id, created_by, tenant_id, items } = data;

    if (!patient_id || !doctor_id || !created_by || !tenant_id) {
      throw new Error('patient_id, doctor_id, and tenant context are required');
    }
    for (const id of [patient_id, doctor_id, created_by, tenant_id]) {
      if (!ValidationUtil.isValidUUID(id)) throw new Error(`Invalid UUID format: ${id}`);
    }
    if (data.appointment_id && !ValidationUtil.isValidUUID(data.appointment_id)) {
      throw new Error('Invalid appointment ID format');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('A prescription requires at least one medication item');
    }

    const status = data.status || PrescriptionStatus.ISSUED;
    const sequelize = Prescription.sequelize!;

    return sequelize.transaction(async (transaction) => {
      const prescription = await Prescription.create({
        prescription_number: generatePrescriptionNumber(),
        patient_id,
        doctor_id,
        appointment_id: data.appointment_id || null,
        status,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        issued_at: status === PrescriptionStatus.ISSUED ? new Date() : null,
        created_by,
        tenant_id
      } as any, { transaction });

      for (const item of items) {
        await PrescriptionItem.create({
          prescription_id: prescription.id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          strength: item.strength || null,
          route: item.route || MedicationRoute.ORAL,
          frequency: item.frequency,
          duration: item.duration || null,
          quantity: item.quantity ?? null,
          instructions: item.instructions || null
        } as any, { transaction });
      }

      return Prescription.findByPk(prescription.id, { include: [itemInclude], transaction });
    });
  },

  getPatientPrescriptions: async (patientId: string, paginationQuery: PaginationQuery, status?: PrescriptionStatus) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');

    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { patient_id: patientId };
    if (status) where.status = status;

    const { count, rows: prescriptions } = await Prescription.findAndCountAll({
      where,
      include: [itemInclude, doctorInclude],
      order: [['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      distinct: true,
      paranoid: true
    });

    return { prescriptions, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getPrescriptionById: async (prescriptionId: string) => {
    if (!ValidationUtil.isValidUUID(prescriptionId)) throw new Error('Invalid prescription ID format');

    const prescription = await Prescription.findByPk(prescriptionId, {
      include: [
        itemInclude,
        doctorInclude,
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn', 'phone'] }
      ]
    });

    if (!prescription) throw new Error('Prescription not found');
    return prescription;
  },

  /** Move an ISSUED (or DRAFT) prescription to SENT_TO_PHARMACY. */
  sendToPharmacy: async (prescriptionId: string, pharmacyName: string) => {
    if (!ValidationUtil.isValidUUID(prescriptionId)) throw new Error('Invalid prescription ID format');
    if (!pharmacyName || !pharmacyName.trim()) throw new Error('pharmacy_name is required');

    const prescription = await Prescription.findByPk(prescriptionId);
    if (!prescription) throw new Error('Prescription not found');

    if (![PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED].includes(prescription.status)) {
      throw new Error(`Cannot send a prescription in status '${prescription.status}' to pharmacy`);
    }

    await prescription.update({
      status: PrescriptionStatus.SENT_TO_PHARMACY,
      pharmacy_name: pharmacyName.trim(),
      sent_to_pharmacy_at: new Date(),
      issued_at: prescription.issued_at || new Date()
    });

    return prescription;
  },

  /**
   * Record dispensing. If `itemIds` is provided, only those items are marked
   * dispensed (→ PARTIALLY_DISPENSED unless all end up dispensed); otherwise
   * every item is dispensed (→ DISPENSED).
   */
  dispense: async (prescriptionId: string, dispensedBy: string, itemIds?: string[]) => {
    if (!ValidationUtil.isValidUUID(prescriptionId)) throw new Error('Invalid prescription ID format');
    if (!ValidationUtil.isValidUUID(dispensedBy)) throw new Error('Invalid dispenser ID format');

    const prescription = await Prescription.findByPk(prescriptionId, { include: [itemInclude] });
    if (!prescription) throw new Error('Prescription not found');

    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new Error('A cancelled prescription cannot be dispensed');
    }
    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new Error('Prescription is already fully dispensed');
    }

    const items = (prescription.items || []) as PrescriptionItem[];
    if (items.length === 0) throw new Error('Prescription has no items to dispense');

    const targetIds = itemIds && itemIds.length > 0 ? new Set(itemIds) : null;

    for (const item of items) {
      if (!targetIds || targetIds.has(item.id)) {
        await item.update({
          is_dispensed: true,
          dispensed_quantity: item.dispensed_quantity ?? item.quantity ?? null
        });
      }
    }

    // Re-read item state to decide overall status
    const fresh = await PrescriptionItem.findAll({ where: { prescription_id: prescription.id } });
    const allDispensed = fresh.every(i => i.is_dispensed);

    await prescription.update({
      status: allDispensed ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIALLY_DISPENSED,
      dispensed_by: dispensedBy,
      dispensed_at: allDispensed ? new Date() : prescription.dispensed_at
    });

    return Prescription.findByPk(prescription.id, { include: [itemInclude] });
  },

  cancel: async (prescriptionId: string, reason?: string) => {
    if (!ValidationUtil.isValidUUID(prescriptionId)) throw new Error('Invalid prescription ID format');

    const prescription = await Prescription.findByPk(prescriptionId);
    if (!prescription) throw new Error('Prescription not found');

    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new Error('A fully dispensed prescription cannot be cancelled');
    }
    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new Error('Prescription is already cancelled');
    }

    await prescription.update({
      status: PrescriptionStatus.CANCELLED,
      cancellation_reason: reason || null
    });

    return prescription;
  }
};
