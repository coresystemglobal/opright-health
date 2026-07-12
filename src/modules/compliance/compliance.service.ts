import {
  Patient, Appointment, Prescription, PrescriptionItem, Invoice, TestOrder,
  VitalSign, ClinicalNote, PatientInsurancePolicy, Admission, ConsentRecord
} from '../../models';
import { ValidationUtil } from '@utils/validation.util';

async function loadPatient(patientId: string, tenantId: string): Promise<Patient> {
  if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
  const patient = await Patient.findByPk(patientId);
  if (!patient) throw new Error('Patient not found');
  if ((patient as any).tenant_id !== tenantId) throw new Error('Patient does not belong to this tenant');
  return patient;
}

export const complianceService = {
  /**
   * Right to access / portability: assemble every record we hold about a
   * patient into one structured export. Returns plain JSON suitable for
   * handing to the data subject.
   */
  exportPatientData: async (patientId: string, tenantId: string) => {
    const patient = await loadPatient(patientId, tenantId);

    const [appointments, prescriptions, invoices, labOrders, vitals, notes, policies, admissions, consents] = await Promise.all([
      Appointment.findAll({ where: { patient_id: patientId }, order: [['createdAt', 'DESC']] }),
      Prescription.findAll({ where: { patient_id: patientId }, include: [{ model: PrescriptionItem, as: 'items' }], order: [['createdAt', 'DESC']] }),
      Invoice.findAll({ where: { patient_id: patientId }, order: [['createdAt', 'DESC']] }),
      TestOrder.findAll({ where: { patient_id: patientId }, order: [['createdAt', 'DESC']] }),
      VitalSign.findAll({ where: { patient_id: patientId }, order: [['recorded_at', 'DESC']] }),
      ClinicalNote.findAll({ where: { patient_id: patientId }, order: [['note_date', 'DESC']] }),
      PatientInsurancePolicy.findAll({ where: { patient_id: patientId } }),
      Admission.findAll({ where: { patient_id: patientId }, order: [['admitted_at', 'DESC']] }),
      ConsentRecord.findAll({ where: { patient_id: patientId }, order: [['createdAt', 'DESC']] })
    ]);

    return {
      generated_at: new Date().toISOString(),
      subject: 'patient_personal_data_export',
      patient,
      records: {
        appointments,
        prescriptions,
        invoices,
        lab_orders: labOrders,
        vital_signs: vitals,
        clinical_notes: notes,
        insurance_policies: policies,
        admissions,
        consents
      },
      counts: {
        appointments: appointments.length,
        prescriptions: prescriptions.length,
        invoices: invoices.length,
        lab_orders: labOrders.length,
        vital_signs: vitals.length,
        clinical_notes: notes.length,
        insurance_policies: policies.length,
        admissions: admissions.length,
        consents: consents.length
      }
    };
  },

  /**
   * Right to erasure via anonymization. Redacts the patient's DIRECT
   * identifiers while retaining clinical records in de-identified form —
   * the defensible approach in healthcare, where medical-record retention
   * law overrides outright deletion. The internal MRN is kept as a
   * pseudonymous key so clinical linkage survives; exact DOB is reduced to
   * the birth year.
   *
   * Idempotent: a patient already anonymized is rejected.
   */
  anonymizePatient: async (patientId: string, tenantId: string) => {
    const patient: any = await loadPatient(patientId, tenantId);
    if (patient.is_anonymized) throw new Error('Patient is already anonymized');

    // Reduce DOB to Jan 1 of the birth year (retains age band, drops exact date)
    let redactedDob = patient.date_of_birth;
    if (patient.date_of_birth) {
      const year = new Date(patient.date_of_birth).getFullYear();
      redactedDob = new Date(Date.UTC(year, 0, 1));
    }

    await patient.update({
      first_name: 'REDACTED',
      last_name: 'REDACTED',
      email: null,
      phone: null,
      address: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      date_of_birth: redactedDob,
      sms_opt_out: true,
      is_anonymized: true,
      anonymized_at: new Date()
    });

    return {
      patient_id: patientId,
      anonymized_at: patient.anonymized_at,
      note: 'Direct identifiers redacted; clinical records retained in de-identified form per medical retention requirements.'
    };
  }
};
