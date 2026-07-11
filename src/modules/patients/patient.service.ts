import { Patient, User } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { Op } from 'sequelize';
import { sanitizeInput } from '@utils/validator';
import { Gender } from '@modules/patients/patient.model';


interface CreatePatientData {
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  user_id?: string;
  tenant_id: string;
}

interface UpdatePatientData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: Date;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  sms_opt_out?: boolean;
}

export const patientService = {
  getAllPatients: async (paginationQuery: PaginationQuery, tenantId: string, search?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      const whereConditions: any = { tenant_id: tenantId };
      const includeConditions: any = [];

      if (search) {
        const sanitizedSearch = sanitizeInput(search.trim());

        if (sanitizedSearch) {
          Object.assign(whereConditions, {
            [Op.or]: [
              { first_name: { [Op.iLike]: `%${sanitizedSearch}%` } },
              { last_name: { [Op.iLike]: `%${sanitizedSearch}%` } },
              { email: { [Op.iLike]: `%${sanitizedSearch}%` } },
              { mrn: { [Op.iLike]: `%${sanitizedSearch}%` } }
            ]
          });
        }
      }

      includeConditions.push({
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
        required: false
      });

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
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
            required: false
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

  getPatientByUserId: async (userId: string, tenantId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      const patient = await Patient.findOne({
        where: { user_id: userId, tenant_id: tenantId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
            required: false
          }
        ]
      });

      if (!patient) {
        throw new Error('Patient profile not found for this user');
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
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        email,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        user_id,
        tenant_id
      } = patientData;

      if (!first_name || !last_name || !date_of_birth || !tenant_id) {
        throw new Error('First name, last name, date of birth, and tenant ID are required');
      }

      if (user_id) {
        if (!ValidationUtil.isValidUUID(user_id)) {
          throw new Error('Invalid user ID format');
        }

        const existingPatient = await Patient.findOne({ where: { user_id, tenant_id } });
        if (existingPatient) {
          throw new Error('Patient profile already exists for this user');
        }
      }

      if (emergency_contact_phone && !ValidationUtil.isValidPhoneNumber(emergency_contact_phone)) {
        throw new Error('Invalid emergency contact phone format');
      }

      const patient = await Patient.create({
        first_name,
        last_name,
        date_of_birth,
        gender: gender || undefined,
        phone: phone || null,
        email: email || null,
        address: address || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        user_id: user_id || null,
        tenant_id
      } as any);

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

      await patient.destroy();

      return true;
    } catch (error) {
      console.error('Delete patient error:', error);
      throw error;
    }
  }
};
