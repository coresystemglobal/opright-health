import { Hospital } from '../../models';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { Op } from 'sequelize';
import { HospitalType, AccreditationStatus } from '@modules/hospital/hospital.model';


interface CreateHospitalData {
  name: string;
  license_number: string;
  hospital_type?: HospitalType;
  description?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  emergency_phone?: string;
  email: string;
  website?: string;
  total_beds?: number;
}

interface UpdateHospitalData {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  emergency_phone?: string;
  email?: string;
  website?: string;
  hospital_type?: HospitalType;
  accreditation_status?: AccreditationStatus;
  total_beds?: number;
  is_active?: boolean;
}

export const hospitalService = {
  getAllHospitals: async (paginationQuery: PaginationQuery, search?: string, city?: string, state?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      const whereConditions: any = {};

      if (search) {
        const sanitized = search.trim();
        whereConditions[Op.or] = [
          { name: { [Op.iLike]: `%${sanitized}%` } },
          { city: { [Op.iLike]: `%${sanitized}%` } }
        ];
      }

      if (city) whereConditions.city = { [Op.iLike]: `%${city}%` };
      if (state) whereConditions.state = { [Op.iLike]: `%${state}%` };

      const { count, rows: hospitals } = await Hospital.findAndCountAll({
        where: whereConditions,
        order: [['name', 'ASC']],
        ...PaginationUtil.getSequelizePagination(paginationOptions),
        paranoid: true
      });

      return {
        hospitals,
        count,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      };
    } catch (error) {
      console.error('Get all hospitals error:', error);
      throw error;
    }
  },

  getHospitalById: async (hospitalId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(hospitalId)) {
        throw new Error('Invalid hospital ID format');
      }

      const hospital = await Hospital.findByPk(hospitalId);

      if (!hospital) {
        throw new Error('Hospital not found');
      }

      return hospital;
    } catch (error) {
      console.error('Get hospital by ID error:', error);
      throw error;
    }
  },

  createHospital: async (hospitalData: CreateHospitalData) => {
    try {
      const {
        name,
        license_number,
        hospital_type,
        description,
        address,
        city,
        state,
        postal_code,
        country,
        phone,
        emergency_phone,
        email,
        website,
        total_beds
      } = hospitalData;

      if (!name || !license_number || !address || !city || !state || !postal_code || !country || !phone || !email) {
        throw new Error('Missing required fields: name, license_number, address, city, state, postal_code, country, phone, email');
      }

      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (!ValidationUtil.isValidPhoneNumber(phone)) {
        throw new Error('Invalid phone number format');
      }

      const existingByLicense = await Hospital.findOne({ where: { license_number } });
      if (existingByLicense) {
        throw new Error('License number already in use');
      }

      const hospital = await Hospital.create({
        name,
        license_number,
        hospital_type: hospital_type || HospitalType.GENERAL,
        description: description || null,
        address,
        city,
        state,
        postal_code,
        country,
        phone,
        emergency_phone: emergency_phone || null,
        email,
        website: website || null,
        total_beds: total_beds || null,
        is_active: true,
        accreditation_status: AccreditationStatus.NOT_ACCREDITED
      } as any);

      return hospital;
    } catch (error) {
      console.error('Create hospital error:', error);
      throw error;
    }
  },

  updateHospital: async (hospitalId: string, updateData: UpdateHospitalData) => {
    try {
      if (!ValidationUtil.isValidUUID(hospitalId)) {
        throw new Error('Invalid hospital ID format');
      }

      const hospital = await Hospital.findByPk(hospitalId);

      if (!hospital) {
        throw new Error('Hospital not found');
      }

      if (updateData.email && !ValidationUtil.isValidEmail(updateData.email)) {
        throw new Error('Invalid email format');
      }

      if (updateData.phone && !ValidationUtil.isValidPhoneNumber(updateData.phone)) {
        throw new Error('Invalid phone number format');
      }

      await hospital.update(updateData);

      return hospital;
    } catch (error) {
      console.error('Update hospital error:', error);
      throw error;
    }
  },

  deleteHospital: async (hospitalId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(hospitalId)) {
        throw new Error('Invalid hospital ID format');
      }

      const hospital = await Hospital.findByPk(hospitalId);

      if (!hospital) {
        throw new Error('Hospital not found');
      }

      await hospital.destroy();
      return true;
    } catch (error) {
      console.error('Delete hospital error:', error);
      throw error;
    }
  },

  toggleHospitalStatus: async (hospitalId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(hospitalId)) {
        throw new Error('Invalid hospital ID format');
      }

      const hospital = await Hospital.findByPk(hospitalId);

      if (!hospital) {
        throw new Error('Hospital not found');
      }

      hospital.is_active = !hospital.is_active;
      await hospital.save();

      return { is_active: hospital.is_active };
    } catch (error) {
      console.error('Toggle hospital status error:', error);
      throw error;
    }
  }
};
