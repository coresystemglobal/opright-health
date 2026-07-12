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
  pharmacy_item_id?: string;
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
          instructions: item.instructions || null,
          pharmacy_item_id: item.pharmacy_item_id || null
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
    const targets = items.filter(item => !targetIds || targetIds.has(item.id));

    // Whole dispense (item marks + linked stock decrements) is atomic: if any
    // pharmacy-linked line lacks stock, nothing is committed.
    const sequelize = Prescription.sequelize!;
    const stockResults: Array<{ item_id: string; pharmacy_item_id: string; dispensed: number }> = [];

    await sequelize.transaction(async (transaction) => {
      const { stockService } = await import('@modules/pharmacy/stock.service');

      for (const item of targets) {
        const qty = item.dispensed_quantity ?? item.quantity ?? null;

        // Decrement real stock for lines linked to a pharmacy catalogue item
        if (item.pharmacy_item_id && qty && qty > 0) {
          await stockService.dispenseStock(
            item.pharmacy_item_id,
            qty,
            dispensedBy,
            prescription.tenant_id,
            { reference_type: 'prescription', reference_id: prescription.id, reason: `Prescription ${prescription.prescription_number}` },
            transaction
          );
          stockResults.push({ item_id: item.id, pharmacy_item_id: item.pharmacy_item_id, dispensed: qty });
        }

        await item.update({ is_dispensed: true, dispensed_quantity: qty }, { transaction });
      }

      // Decide overall status from the full item set within the same transaction
      const fresh = await PrescriptionItem.findAll({ where: { prescription_id: prescription.id }, transaction });
      const allDispensed = fresh.every(i => i.is_dispensed);

      await prescription.update({
        status: allDispensed ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIALLY_DISPENSED,
        dispensed_by: dispensedBy,
        dispensed_at: allDispensed ? new Date() : prescription.dispensed_at
      }, { transaction });
    });

    const result: any = await Prescription.findByPk(prescription.id, { include: [itemInclude] });
    if (stockResults.length) (result as any).dataValues.stock_dispensed = stockResults;
    return result;
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
