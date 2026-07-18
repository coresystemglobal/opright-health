import { Allergy, AllergyType, AllergySeverity } from '@modules/clinical/allergy.model';

import { Medication, MedicationRoute, MedicationFrequency } from '@modules/clinical/medication.model';

import { VitalSign } from '@modules/clinical/vital-sign.model';

import { ClinicalNote, NoteType } from '@modules/clinical/clinical-note.model';

import { MedicalRecord, RecordType } from '@modules/clinical/medical-record.model';

import { Patient } from '@modules/patients/patient.model';

import { Op, CreationAttributes } from 'sequelize';

interface CreateAllergyDTO {
  patient_id: string;
  allergen_name: string;
  allergen_type: AllergyType;
  severity: AllergySeverity;
  reaction?: string;
  symptoms?: string;
  treatment?: string;
  onset_date?: Date;
  notes?: string;
  recorded_by: string;
  tenant_id: string;
}

interface CreateMedicationDTO {
  patient_id: string;
  medication_name: string;
  dosage: string;
  strength?: string;
  route: MedicationRoute;
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

interface CreateVitalSignDTO {
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
  recorded_by: string;
  tenant_id: string;
}

interface CreateClinicalNoteDTO {
  patient_id: string;
  appointment_id?: string;
  doctor_id: string;
  note_type: NoteType;
  title?: string;
  chief_complaint?: string;
  soap_note?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  content?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescriptions?: string;
  follow_up_instructions?: string;
  follow_up_date?: Date;
  created_by: string;
  tenant_id: string;
}

interface CreateMedicalRecordDTO {
  patient_id: string;
  appointment_id?: string;
  doctor_id?: string;
  record_type: RecordType;
  title: string;
  description?: string;
  findings?: string;
  icd10_codes?: string[];
  procedures_performed?: string;
  medications_prescribed?: string;
  lab_results?: string;
  attachments?: string[];
  notes?: string;
  is_confidential?: boolean;
  created_by: string;
  tenant_id: string;
}

export class EMRService {
  // ============ ALLERGY MANAGEMENT ============
  
  static async createAllergy(data: CreateAllergyDTO): Promise<Allergy> {
    return await Allergy.create(data as unknown as CreationAttributes<Allergy>);
  }

  static async getPatientAllergies(patientId: string, activeOnly: boolean = true): Promise<Allergy[]> {
    const where: any = { patient_id: patientId };
    if (activeOnly) {
      where.is_active = true;
    }

    return await Allergy.findAll({
      where,
      order: [['severity', 'DESC'], ['created_at', 'DESC']],
      include: [{ association: 'recorder', attributes: ['id', 'first_name', 'last_name'] }]
    });
  }

  static async getCriticalAllergies(patientId: string): Promise<Allergy[]> {
    return await Allergy.findAll({
      where: {
        patient_id: patientId,
        is_active: true,
        severity: {
          [Op.in]: [AllergySeverity.SEVERE, AllergySeverity.LIFE_THREATENING]
        }
      },
      order: [['severity', 'DESC']]
    });
  }

  static async updateAllergy(allergyId: string, updates: Partial<CreateAllergyDTO>): Promise<Allergy> {
    const allergy = await Allergy.findByPk(allergyId);
    if (!allergy) {
      throw new Error('Allergy not found');
    }

    await allergy.update(updates);
    return allergy;
  }

  static async deactivateAllergy(allergyId: string): Promise<void> {
    const allergy = await Allergy.findByPk(allergyId);
    if (!allergy) {
      throw new Error('Allergy not found');
    }

    await allergy.update({ is_active: false });
  }

  // ============ MEDICATION MANAGEMENT ============

  static async createMedication(data: CreateMedicationDTO): Promise<Medication> {
    return await Medication.create(data as unknown as CreationAttributes<Medication>);
  }

  static async getPatientMedications(patientId: string, activeOnly: boolean = true): Promise<Medication[]> {
    const where: any = { patient_id: patientId };
    if (activeOnly) {
      where.is_active = true;
    }

    return await Medication.findAll({
      where,
      order: [['start_date', 'DESC']],
      include: [
        { association: 'prescribing_doctor', attributes: ['id', 'specialization'] },
        { association: 'recorder', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });
  }

  static async getCurrentMedications(patientId: string): Promise<Medication[]> {
    const medications = await this.getPatientMedications(patientId, true);
    return medications.filter(med => med.is_current);
  }

  static async updateMedication(medicationId: string, updates: Partial<CreateMedicationDTO>): Promise<Medication> {
    const medication = await Medication.findByPk(medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }

    await medication.update(updates);
    return medication;
  }

  static async discontinueMedication(medicationId: string, endDate?: Date): Promise<void> {
    const medication = await Medication.findByPk(medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }

    await medication.update({
      is_active: false,
      end_date: endDate || new Date()
    });
  }

  // ============ VITAL SIGNS ============

  static async recordVitalSigns(data: CreateVitalSignDTO): Promise<VitalSign> {
    const vitalSign = await VitalSign.create(data);
    
    // Auto-calculate BMI if height and weight provided
    if (vitalSign.height && vitalSign.weight && !vitalSign.bmi) {
      const calculatedBMI = vitalSign.calculated_bmi;
      if (calculatedBMI) {
        await vitalSign.update({ bmi: calculatedBMI });
      }
    }

    return vitalSign;
  }

  static async getPatientVitals(
    patientId: string, 
    limit: number = 10
  ): Promise<VitalSign[]> {
    return await VitalSign.findAll({
      where: { patient_id: patientId },
      order: [['recorded_at', 'DESC']],
      limit,
      include: [{ association: 'recorder', attributes: ['id', 'first_name', 'last_name'] }]
    });
  }

  static async getLatestVitals(patientId: string): Promise<VitalSign | null> {
    return await VitalSign.findOne({
      where: { patient_id: patientId },
      order: [['recorded_at', 'DESC']]
    });
  }

  static async getVitalsByAppointment(appointmentId: string): Promise<VitalSign[]> {
    return await VitalSign.findAll({
      where: { appointment_id: appointmentId },
      order: [['recorded_at', 'ASC']]
    });
  }

  static async getAbnormalVitals(patientId: string): Promise<VitalSign[]> {
    const vitals = await this.getPatientVitals(patientId, 20);
    return vitals.filter(v => v.has_abnormal_values);
  }

  // ============ CLINICAL NOTES ============

  static async createClinicalNote(data: CreateClinicalNoteDTO): Promise<ClinicalNote> {
    return await ClinicalNote.create({
      ...data,
      note_date: new Date()
    });
  }

  static async getClinicalNotes(patientId: string, limit: number = 20): Promise<ClinicalNote[]> {
    return await ClinicalNote.findAll({
      where: { patient_id: patientId },
      order: [['note_date', 'DESC']],
      limit,
      include: [
        { association: 'doctor', attributes: ['id', 'specialization'] },
        { association: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });
  }

  static async getNotesByAppointment(appointmentId: string): Promise<ClinicalNote[]> {
    return await ClinicalNote.findAll({
      where: { appointment_id: appointmentId },
      order: [['note_date', 'ASC']]
    });
  }

  static async getNoteById(noteId: string): Promise<ClinicalNote | null> {
    return await ClinicalNote.findByPk(noteId, {
      include: ['doctor', 'creator', 'modifier']
    });
  }

  static async updateClinicalNote(
    noteId: string, 
    updates: Partial<CreateClinicalNoteDTO>,
    userId: string
  ): Promise<ClinicalNote> {
    const note = await ClinicalNote.findByPk(noteId);
    if (!note) {
      throw new Error('Clinical note not found');
    }

    if (!note.canEdit(userId)) {
      throw new Error('Cannot edit this note. Note is locked or edit window has expired.');
    }

    await note.update({
      ...updates,
      last_modified_by: userId
    });

    return note;
  }

  static async lockClinicalNote(noteId: string, userId: string): Promise<void> {
    const note = await ClinicalNote.findByPk(noteId);
    if (!note) {
      throw new Error('Clinical note not found');
    }

    await note.lock(userId);
  }

  // ============ MEDICAL RECORDS ============

  static async createMedicalRecord(data: CreateMedicalRecordDTO): Promise<MedicalRecord> {
    return await MedicalRecord.create({
      ...data,
      record_date: new Date(),
      version: 1
    });
  }

  static async getMedicalRecords(
    patientId: string,
    options?: {
      recordType?: RecordType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<MedicalRecord[]> {
    const where: any = { patient_id: patientId };

    if (options?.recordType) {
      where.record_type = options.recordType;
    }

    if (options?.startDate || options?.endDate) {
      where.record_date = {};
      if (options.startDate) {
        where.record_date[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.record_date[Op.lte] = options.endDate;
      }
    }

    return await MedicalRecord.findAll({
      where,
      order: [['record_date', 'DESC']],
      limit: options?.limit || 50,
      include: [
        { association: 'doctor', attributes: ['id', 'specialization'] },
        { association: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });
  }

  static async getRecordById(recordId: string): Promise<MedicalRecord | null> {
    return await MedicalRecord.findByPk(recordId, {
      include: ['doctor', 'creator', 'appointment']
    });
  }

  static async createRecordVersion(
    recordId: string,
    updates: Partial<CreateMedicalRecordDTO>,
    userId: string
  ): Promise<MedicalRecord> {
    const originalRecord = await MedicalRecord.findByPk(recordId);
    if (!originalRecord) {
      throw new Error('Medical record not found');
    }

    return await originalRecord.createNewVersion(updates, userId);
  }

  static async getRecordVersionHistory(recordId: string): Promise<MedicalRecord[]> {
    const versions: MedicalRecord[] = [];
    let currentRecord = await MedicalRecord.findByPk(recordId);

    while (currentRecord) {
      versions.push(currentRecord);
      if (currentRecord.previous_version_id) {
        currentRecord = await MedicalRecord.findByPk(currentRecord.previous_version_id);
      } else {
        currentRecord = null;
      }
    }

    return versions;
  }

  // ============ COMPREHENSIVE PATIENT EMR ============

  static async getPatientEMRSummary(patientId: string, tenantId?: string): Promise<any> {
    const where: any = { id: patientId };
    if (tenantId) where.tenant_id = tenantId; // tenant-scope when a context is available
    const patient = await Patient.findOne({ where });
    if (!patient) {
      throw new Error('Patient not found');
    }

    const [
      allergies,
      medications,
      latestVitals,
      recentNotes,
      recentRecords
    ] = await Promise.all([
      this.getPatientAllergies(patientId, true),
      this.getCurrentMedications(patientId),
      this.getLatestVitals(patientId),
      this.getClinicalNotes(patientId, 5),
      this.getMedicalRecords(patientId, { limit: 10 })
    ]);

    const criticalAllergies = allergies.filter(a => a.is_critical);

    // Extract all ICD-10 codes
    const icd10Codes = new Set<string>();
    recentRecords.forEach(record => {
      if (record.icd10_codes) {
        record.icd10_codes.forEach(code => icd10Codes.add(code));
      }
    });

    return {
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        full_name: patient.full_name,
        age: patient.age,
        gender: patient.gender
      },
      allergies: {
        total: allergies.length,
        critical: criticalAllergies.length,
        list: allergies.map(a => ({
          id: a.id,
          name: a.allergen_name,
          type: a.allergen_type,
          severity: a.severity,
          is_critical: a.is_critical
        }))
      },
      medications: {
        total: medications.length,
        list: medications.map(m => ({
          id: m.id,
          name: m.display_dosage,
          frequency: m.frequency,
          start_date: m.start_date
        }))
      },
      latest_vitals: latestVitals ? {
        recorded_at: latestVitals.recorded_at,
        blood_pressure: latestVitals.blood_pressure,
        heart_rate: latestVitals.heart_rate,
        temperature: latestVitals.temperature,
        bmi: latestVitals.bmi || latestVitals.calculated_bmi,
        bmi_category: latestVitals.bmi_category,
        has_abnormal: latestVitals.has_abnormal_values,
        abnormal_values: latestVitals.has_abnormal_values ? latestVitals.getAbnormalValues() : []
      } : null,
      recent_notes: recentNotes.map(n => ({
        id: n.id,
        type: n.note_type,
        title: n.display_summary,
        date: n.note_date,
        is_locked: n.is_locked
      })),
      medical_history: {
        recent_records: recentRecords.length,
        icd10_codes: Array.from(icd10Codes),
        record_types: Array.from(new Set(recentRecords.map(r => r.record_type)))
      }
    };
  }
}
