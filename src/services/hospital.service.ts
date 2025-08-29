import { Hospital } from '../models';
import { PaginationQuery } from '../types/common.types';
import { PaginationUtil } from '../utils/pagination.util';
import { ValidationUtil } from '../utils/validation.util';

interface CreateHospitalData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  website?: string;
  type?: string;
  capacity?: number;
  facilities?: string[];
  specialties?: string[];
}

interface UpdateHospitalData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  type?: string;
  capacity?: number;
  facilities?: string[];
  specialties?: string[];
  is_active?: boolean;
}

export const hospitalService = {
  getAllHospitals: async (paginationQuery: PaginationQuery, search?: string, city?: string, state?: string) => {
    try {
      const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);

      // Build search conditions
      const whereConditions: any = {};
      
      if (search) {
        whereConditions.name = { $iLike: `%${search}%` };
      }

      if (city) {
        whereConditions.city = city;
      }

      if (state) {
        whereConditions.state = state;
      }

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
        address,
        city,
        state,
        country,
        postal_code,
        phone,
        email,
        website,
        type,
        capacity,
        facilities,
        specialties
      } = hospitalData;

      // Validate required fields
      const requiredFields = ['name', 'address', 'city', 'state', 'country', 'postal_code', 'phone', 'email'];
      const missingFields = ValidationUtil.validateRequiredFields(hospitalData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtil.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Validate phone number
      if (!ValidationUtil.isValidPhoneNumber(phone)) {
        throw new Error('Invalid phone number format');
      }

      // Check if hospital with this name already exists in this location
      const existingHospital = await Hospital.findOne({
        where: { 
          name,
          city,
          state,
          country
        }
      });

      if (existingHospital) {
        throw new Error('Hospital with this name already exists in this location');
      }

      const hospital = await Hospital.create({
        name,
        address,
        city,
        state,
        country,
        postal_code,
        phone,
        email,
        website: website || null,
        type: type || 'General',
        capacity: capacity || null,
        facilities: facilities || [],
        specialties: specialties || [],
        is_active: true
      });

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

      // Validate email if provided
      if (updateData.email && !ValidationUtil.isValidEmail(updateData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate phone if provided
      if (updateData.phone && !ValidationUtil.isValidPhoneNumber(updateData.phone)) {
        throw new Error('Invalid phone number format');
      }

      // Check for name uniqueness if name is changing
      if (updateData.name && updateData.name !== hospital.name) {
        const locationFields = {
          city: updateData.city || hospital.city,
          state: updateData.state || hospital.state,
          country: updateData.country || hospital.country
        };
        
        const existingHospital = await Hospital.findOne({
          where: { 
            name: updateData.name,
            ...locationFields
          }
        });

        if (existingHospital && existingHospital.id !== hospitalId) {
          throw new Error('Hospital with this name already exists in this location');
        }
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

      // Soft delete
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

      // Toggle status
      hospital.is_active = !hospital.is_active;
      await hospital.save();

      return {
        is_active: hospital.is_active
      };
    } catch (error) {
      console.error('Toggle hospital status error:', error);
      throw error;
    }
  }
};