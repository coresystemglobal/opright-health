import { FamilyMember, FamilyRelationship } from '@modules/patients/family-member.model';

import { ValidationUtil } from '@utils/validation.util';

interface CreateFamilyMemberData {
  first_name: string;
  last_name: string;
  relationship: FamilyRelationship;
  date_of_birth?: string;
  blood_type?: string;
  gender?: string;
  phone?: string;
  allergies?: string;
  medical_notes?: string;
  user_id: string;
  tenant_id: string;
}

interface UpdateFamilyMemberData {
  first_name?: string;
  last_name?: string;
  relationship?: FamilyRelationship;
  date_of_birth?: string;
  blood_type?: string;
  gender?: string;
  phone?: string;
  allergies?: string;
  medical_notes?: string;
}

export const familyService = {
  createMember: async (data: CreateFamilyMemberData) => {
    try {
      const { first_name, last_name, relationship, user_id, tenant_id } = data;

      if (!first_name || !last_name || !relationship || !user_id || !tenant_id) {
        throw new Error('first_name, last_name, relationship, user_id, and tenant_id are required');
      }

      if (!ValidationUtil.isValidUUID(user_id) || !ValidationUtil.isValidUUID(tenant_id)) {
        throw new Error('Invalid ID format');
      }

      const member = await FamilyMember.create({
        first_name,
        last_name,
        relationship,
        date_of_birth: data.date_of_birth || null,
        blood_type: data.blood_type || null,
        gender: data.gender || null,
        phone: data.phone || null,
        allergies: data.allergies || null,
        medical_notes: data.medical_notes || null,
        user_id,
        tenant_id
      } as any);

      return member;
    } catch (error) {
      console.error('Create family member error:', error);
      throw error;
    }
  },

  getAllMembers: async (userId: string, tenantId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      const members = await FamilyMember.findAll({
        where: { user_id: userId, tenant_id: tenantId },
        order: [['createdAt', 'DESC']],
        paranoid: true
      });

      return members;
    } catch (error) {
      console.error('Get family members error:', error);
      throw error;
    }
  },

  getMemberById: async (memberId: string, userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(memberId)) {
        throw new Error('Invalid family member ID format');
      }

      const member = await FamilyMember.findOne({
        where: { id: memberId, user_id: userId }
      });

      if (!member) {
        throw new Error('Family member not found');
      }

      return member;
    } catch (error) {
      console.error('Get family member error:', error);
      throw error;
    }
  },

  updateMember: async (memberId: string, userId: string, updateData: UpdateFamilyMemberData) => {
    try {
      if (!ValidationUtil.isValidUUID(memberId)) {
        throw new Error('Invalid family member ID format');
      }

      const member = await FamilyMember.findOne({ where: { id: memberId, user_id: userId } });

      if (!member) {
        throw new Error('Family member not found');
      }

      await member.update(updateData);
      return member;
    } catch (error) {
      console.error('Update family member error:', error);
      throw error;
    }
  },

  deleteMember: async (memberId: string, userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(memberId)) {
        throw new Error('Invalid family member ID format');
      }

      const member = await FamilyMember.findOne({ where: { id: memberId, user_id: userId } });

      if (!member) {
        throw new Error('Family member not found');
      }

      await member.destroy();
      return true;
    } catch (error) {
      console.error('Delete family member error:', error);
      throw error;
    }
  }
};
