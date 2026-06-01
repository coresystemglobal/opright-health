import { Doctor, User } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { Op } from 'sequelize';
import { Specialization } from '@modules/doctors/doctor.model';


interface CreateDoctorData {
  user_id: string;
  specialization: Specialization;
  license_number: string;
  consultation_fee: number;
  experience_years?: number;
  qualification?: string;
  department_id?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  appointment_duration_minutes?: number;
  max_appointments_per_day?: number;
}

interface UpdateDoctorData {
  specialization?: Specialization;
  license_number?: string;
  consultation_fee?: number;
  experience_years?: number;
  qualification?: string;
  department_id?: string;
  is_available?: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  appointment_duration_minutes?: number;
  max_appointments_per_day?: number;
}

export const doctorService = {
  getAllDoctors: async (paginationQuery: PaginationQuery, search?: string, specialization?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      const whereConditions: any = {};

      if (specialization) {
        whereConditions.specialization = specialization;
      }

      const includeConditions: any = [];

      if (search) {
        const sanitizedSearch = search.trim();
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
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
          required: false
        });
      }

      const { count, rows: doctors } = await Doctor.findAndCountAll({
        where: whereConditions,
        include: includeConditions,
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
      const {
        user_id,
        specialization,
        license_number,
        consultation_fee,
        experience_years,
        qualification,
        department_id,
        working_hours_start,
        working_hours_end,
        appointment_duration_minutes,
        max_appointments_per_day
      } = doctorData;

      if (!user_id || !specialization || !license_number || consultation_fee === undefined) {
        throw new Error('User ID, specialization, license number, and consultation fee are required');
      }

      if (!ValidationUtil.isValidUUID(user_id)) {
        throw new Error('Invalid user ID format');
      }

      const existingDoctor = await Doctor.findOne({ where: { user_id } });
      if (existingDoctor) {
        throw new Error('Doctor profile already exists for this user');
      }

      const doctorWithLicense = await Doctor.findOne({ where: { license_number } });
      if (doctorWithLicense) {
        throw new Error('License number already in use');
      }

      const doctor = await Doctor.create({
        user_id,
        specialization,
        license_number,
        consultation_fee,
        experience_years: experience_years ?? 0,
        qualification: qualification || null,
        department_id: department_id || null,
        working_hours_start: working_hours_start || '09:00:00',
        working_hours_end: working_hours_end || '17:00:00',
        appointment_duration_minutes: appointment_duration_minutes ?? 30,
        max_appointments_per_day: max_appointments_per_day ?? 20,
        is_available: true
      } as any);

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

      if (updateData.license_number && updateData.license_number !== doctor.license_number) {
        const doctorWithLicense = await Doctor.findOne({ where: { license_number: updateData.license_number } });
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

      doctor.is_available = !doctor.is_available;
      await doctor.save();

      return { is_available: doctor.is_available };
    } catch (error) {
      console.error('Toggle doctor status error:', error);
      throw error;
    }
  }
};
