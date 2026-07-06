import { ClinicalNote, Patient, Doctor, User } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { NoteType } from '@modules/clinical/clinical-note.model';

interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface CreateClinicalNoteData {
  patient_id: string;
  appointment_id?: string;
  doctor_id: string;
  note_type?: NoteType;
  title?: string;
  chief_complaint?: string;
  soap_note?: SOAPNote;
  content?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescriptions?: string;
  follow_up_instructions?: string;
  follow_up_date?: Date;
  note_date?: Date;
  created_by: string;
  tenant_id: string;
}

interface UpdateClinicalNoteData {
  note_type?: NoteType;
  title?: string;
  chief_complaint?: string;
  soap_note?: SOAPNote;
  content?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescriptions?: string;
  follow_up_instructions?: string;
  follow_up_date?: Date;
  last_modified_by?: string;
}

const doctorInclude = {
  model: Doctor,
  as: 'doctor',
  include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }]
};

export const clinicalNoteService = {
  createNote: async (data: CreateClinicalNoteData) => {
    try {
      const { patient_id, doctor_id, created_by, tenant_id, note_type } = data;

      if (!patient_id || !doctor_id || !created_by || !tenant_id) {
        throw new Error('patient_id, doctor_id, and tenant context are required');
      }

      for (const id of [patient_id, doctor_id, created_by, tenant_id]) {
        if (!ValidationUtil.isValidUUID(id)) {
          throw new Error(`Invalid UUID format: ${id}`);
        }
      }
      if (data.appointment_id && !ValidationUtil.isValidUUID(data.appointment_id)) {
        throw new Error('Invalid appointment ID format');
      }

      // A SOAP note should carry the structured body
      if (note_type === NoteType.SOAP && !data.soap_note && !data.content) {
        throw new Error('A SOAP note requires a soap_note body (subjective/objective/assessment/plan)');
      }

      const note = await ClinicalNote.create({
        patient_id,
        appointment_id: data.appointment_id || null,
        doctor_id,
        note_type: note_type || NoteType.PROGRESS,
        title: data.title || null,
        chief_complaint: data.chief_complaint || null,
        soap_note: data.soap_note || null,
        content: data.content || null,
        diagnosis: data.diagnosis || null,
        treatment_plan: data.treatment_plan || null,
        prescriptions: data.prescriptions || null,
        follow_up_instructions: data.follow_up_instructions || null,
        follow_up_date: data.follow_up_date || null,
        note_date: data.note_date || new Date(),
        created_by,
        tenant_id
      } as any);

      return note;
    } catch (error) {
      console.error('Create clinical note error:', error);
      throw error;
    }
  },

  getPatientNotes: async (patientId: string, paginationQuery: PaginationQuery, noteType?: NoteType) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
      const whereConditions: any = { patient_id: patientId };

      if (noteType) {
        whereConditions.note_type = noteType;
      }

      const { count, rows: notes } = await ClinicalNote.findAndCountAll({
        where: whereConditions,
        include: [doctorInclude],
        order: [['note_date', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return { notes, count, page: paginationOptions.page, limit: paginationOptions.limit };
    } catch (error) {
      console.error('Get patient clinical notes error:', error);
      throw error;
    }
  },

  getNoteById: async (noteId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(noteId)) {
        throw new Error('Invalid note ID format');
      }

      const note = await ClinicalNote.findByPk(noteId, {
        include: [
          { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'] },
          doctorInclude,
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
        ]
      });

      if (!note) {
        throw new Error('Clinical note not found');
      }

      return note;
    } catch (error) {
      console.error('Get clinical note by ID error:', error);
      throw error;
    }
  },

  updateNote: async (noteId: string, updateData: UpdateClinicalNoteData, userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(noteId)) {
        throw new Error('Invalid note ID format');
      }

      const note = await ClinicalNote.findByPk(noteId);

      if (!note) {
        throw new Error('Clinical note not found');
      }

      // A locked (signed) note is immutable; recent-edit window enforced by the model
      if (!note.canEdit(userId)) {
        throw new Error('Note cannot be edited: it is locked or the edit window has passed');
      }

      await note.update({ ...updateData, last_modified_by: userId });
      return note;
    } catch (error) {
      console.error('Update clinical note error:', error);
      throw error;
    }
  },

  lockNote: async (noteId: string, userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(noteId)) {
        throw new Error('Invalid note ID format');
      }

      const note = await ClinicalNote.findByPk(noteId);

      if (!note) {
        throw new Error('Clinical note not found');
      }

      // lock() throws if already locked
      await note.lock(userId);
      return note;
    } catch (error) {
      console.error('Lock clinical note error:', error);
      throw error;
    }
  },

  deleteNote: async (noteId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(noteId)) {
        throw new Error('Invalid note ID format');
      }

      const note = await ClinicalNote.findByPk(noteId);

      if (!note) {
        throw new Error('Clinical note not found');
      }

      if (note.is_locked) {
        throw new Error('A locked clinical note cannot be deleted');
      }

      await note.destroy();
      return true;
    } catch (error) {
      console.error('Delete clinical note error:', error);
      throw error;
    }
  }
};
