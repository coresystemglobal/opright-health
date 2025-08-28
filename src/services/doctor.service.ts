import { Doctor, User } from '../models';
import { PaginationQuery } from '../types/common.types';
import { PaginationUtil } from '../utils/pagination.util';
import { ValidationUtil } from '../utils/validation.util';

interface CreateDoctorData {
  user_id: string;
  specialization: string;
  license_number: string;
  experience_years?: number;
}

interface UpdateDoctorData {
  specialization?: string;
  license_number?: string;
  experience_years?: number;
  is_available?: boolean;
}

export const doctorService = {
  getAllDoctors: async (paginationQuery: PaginationQuery, search?: string, specialization?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build search conditions
      const whereConditions: any = {};
      
      if (search) {
        whereConditions['$User.first_name$'] = { $iLike: `%${search}%` };
        // Add more search conditions as needed
      }

      if (specialization) {
        whereConditions.specialization = specialization;
      }

      const { count, rows: doctors } = await Doctor.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ],
        order: [['createdAt', 'DESC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        doctors,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all doctors error:', error);
      throw error;
    }
  },

  getDoctorById: async (doctorId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const doctor = await Doctor.findByPk(doctorId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ]
      });

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      return doctor;
    } catch (error) {
      console.error('Get doctor by ID error:', error);
      throw error;
    }
  },

  getDoctorByUserId: async (userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      const doctor = await Doctor.findOne({
        where: { user_id: userId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ]
      });

      if (!doctor) {
        throw new Error('Doctor not found for this user');
      }

      return doctor;
    } catch (error) {
      console.error('Get doctor by user ID error:', error);
      throw error;
    }
  },

  createDoctor: async (doctorData: CreateDoctorData) => {
    try {
      const { user_id, specialization, license_number, experience_years } = doctorData;

      if (!user_id || !specialization || !license_number) {
        throw new Error('User ID, specialization, and license number are required');
      }

      if (!ValidationUtil.isValidUUID(user_id)) {
        throw new Error('Invalid user ID format');
      }

      // Check if doctor with this user_id already exists
      const existingDoctor = await Doctor.findOne({
        where: { user_id }
      });

      if (existingDoctor) {
        throw new Error('Doctor profile already exists for this user');
      }

      // Check if license number is unique
      const doctorWithLicense = await Doctor.findOne({
        where: { license_number }
      });

      if (doctorWithLicense) {
        throw new Error('License number already in use');
      }

      const doctor = await Doctor.create({
        user_id,
        specialization,
        license_number,
        experience_years: experience_years || 0,
        is_available: true
      });

      return doctor;
    } catch (error) {
      console.error('Create doctor error:', error);
      throw error;
    }
  },

  updateDoctor: async (doctorId: string, updateData: UpdateDoctorData) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const doctor = await Doctor.findByPk(doctorId);

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Check if license number is unique if it's being updated
      if (updateData.license_number && updateData.license_number !== doctor.license_number) {
        const doctorWithLicense = await Doctor.findOne({
          where: { license_number: updateData.license_number }
        });

        if (doctorWithLicense) {
          throw new Error('License number already in use');
        }
      }

      await doctor.update(updateData);

      return doctor;
    } catch (error) {
      console.error('Update doctor error:', error);
      throw error;
    }
  },

  deleteDoctor: async (doctorId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const doctor = await Doctor.findByPk(doctorId);

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Soft delete
      await doctor.destroy();

      return true;
    } catch (error) {
      console.error('Delete doctor error:', error);
      throw error;
    }
  },

  toggleDoctorStatus: async (doctorId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const doctor = await Doctor.findByPk(doctorId);

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Toggle status
      doctor.is_available = !doctor.is_available;
      await doctor.save();

      return {
        is_available: doctor.is_available
      };
    } catch (error) {
      console.error('Toggle doctor status error:', error);
      throw error;
    }
  }
};