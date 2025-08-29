import { Patient, User } from '../models';
import { PaginationQuery } from '../types/common.types';
import { PaginationUtil } from '../utils/pagination.util';
import { ValidationUtil } from '../utils/validation.util';
import { Op } from 'sequelize';
import { sanitizeInput } from '../utils/validator';

interface CreatePatientData {
  user_id: string;
  date_of_birth: Date;
  gender: string;
  blood_group?: string;
  height?: number;
  weight?: number;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface UpdatePatientData {
  date_of_birth?: Date;
  gender?: string;
  blood_group?: string;
  height?: number;
  weight?: number;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export const patientService = {
  getAllPatients: async (paginationQuery: PaginationQuery, search?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build safe search conditions
      const whereConditions: any = {};
      const includeConditions: any = [];
      
      if (search) {
        // Sanitize search input to prevent NoSQL injection
        const sanitizedSearch = sanitizeInput(search.trim());
        
        if (sanitizedSearch) {
          includeConditions.push({
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
            where: {
              [Op.or]: [
                { first_name: { [Op.iLike]: `%${sanitizedSearch}%` } },
                { last_name: { [Op.iLike]: `%${sanitizedSearch}%` } },
                { email: { [Op.iLike]: `%${sanitizedSearch}%` } }
              ]
            }
          });
        } else {
          includeConditions.push({
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          });
        }
      } else {
        includeConditions.push({
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        });
      }

      const { count, rows: patients } = await Patient.findAndCountAll({
        where: whereConditions,
        include: includeConditions,
        order: [['createdAt', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        patients,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all patients error:', error);
      throw error;
    }
  },

  getPatientById: async (patientId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const patient = await Patient.findByPk(patientId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ]
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      return patient;
    } catch (error) {
      console.error('Get patient by ID error:', error);
      throw error;
    }
  },

  getPatientByUserId: async (userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      const patient = await Patient.findOne({
        where: { user_id: userId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ]
      });

      if (!patient) {
        throw new Error('Patient not found for this user');
      }

      return patient;
    } catch (error) {
      console.error('Get patient by user ID error:', error);
      throw error;
    }
  },

  createPatient: async (patientData: CreatePatientData) => {
    try {
      const { 
        user_id, 
        date_of_birth, 
        gender, 
        blood_group, 
        height, 
        weight, 
        allergies, 
        medical_conditions,
        emergency_contact_name,
        emergency_contact_phone
      } = patientData;

      if (!user_id || !date_of_birth || !gender) {
        throw new Error('User ID, date of birth, and gender are required');
      }

      if (!ValidationUtil.isValidUUID(user_id)) {
        throw new Error('Invalid user ID format');
      }

      // Check if patient with this user_id already exists
      const existingPatient = await Patient.findOne({
        where: { user_id }
      });

      if (existingPatient) {
        throw new Error('Patient profile already exists for this user');
      }

      // Validate emergency contact phone if provided
      if (emergency_contact_phone && !ValidationUtil.isValidPhoneNumber(emergency_contact_phone)) {
        throw new Error('Invalid emergency contact phone format');
      }

      const patient = await Patient.create({
        user_id,
        date_of_birth,
        gender,
        blood_group: blood_group || null,
        height: height || null,
        weight: weight || null,
        allergies: allergies || null,
        medical_conditions: medical_conditions || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null
      });

      return patient;
    } catch (error) {
      console.error('Create patient error:', error);
      throw error;
    }
  },

  updatePatient: async (patientId: string, updateData: UpdatePatientData) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const patient = await Patient.findByPk(patientId);

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Validate emergency contact phone if provided
      if (updateData.emergency_contact_phone && !ValidationUtil.isValidPhoneNumber(updateData.emergency_contact_phone)) {
        throw new Error('Invalid emergency contact phone format');
      }

      await patient.update(updateData);

      return patient;
    } catch (error) {
      console.error('Update patient error:', error);
      throw error;
    }
  },

  deletePatient: async (patientId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(patientId)) {
        throw new Error('Invalid patient ID format');
      }

      const patient = await Patient.findByPk(patientId);

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Soft delete
      await patient.destroy();

      return true;
    } catch (error) {
      console.error('Delete patient error:', error);
      throw error;
    }
  }
};