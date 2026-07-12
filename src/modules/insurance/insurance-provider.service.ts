import { Op } from 'sequelize';
import { InsuranceProvider } from '../../models';
import { ProviderType } from '@modules/insurance/insurance-provider.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateProviderData {
  name: string;
  code: string;
  provider_type?: ProviderType;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  tenant_id: string;
}

export const insuranceProviderService = {
  createProvider: async (data: CreateProviderData) => {
    const { name, code, tenant_id } = data;
    if (!name || !code || !tenant_id) throw new Error('name, code, and tenant context are required');
    try {
      return await InsuranceProvider.create({
        name,
        code,
        provider_type: data.provider_type || ProviderType.HMO,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        address: data.address || null,
        tenant_id
      } as any);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error(`A provider with code '${code}' already exists`);
      throw error;
    }
  },

  listProviders: async (tenantId: string, paginationQuery: PaginationQuery, filters: { q?: string; is_active?: boolean } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.q}%` } },
        { code: { [Op.iLike]: `%${filters.q}%` } }
      ];
    }
    const { count, rows: providers } = await InsuranceProvider.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { providers, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getProviderById: async (providerId: string) => {
    if (!ValidationUtil.isValidUUID(providerId)) throw new Error('Invalid provider ID format');
    const provider = await InsuranceProvider.findByPk(providerId);
    if (!provider) throw new Error('Insurance provider not found');
    return provider;
  },

  updateProvider: async (providerId: string, updateData: Partial<CreateProviderData> & { is_active?: boolean }) => {
    if (!ValidationUtil.isValidUUID(providerId)) throw new Error('Invalid provider ID format');
    const provider = await InsuranceProvider.findByPk(providerId);
    if (!provider) throw new Error('Insurance provider not found');
    try {
      await provider.update(updateData);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') throw new Error('A provider with that code already exists');
      throw error;
    }
    return provider;
  },

  deleteProvider: async (providerId: string) => {
    if (!ValidationUtil.isValidUUID(providerId)) throw new Error('Invalid provider ID format');
    const provider = await InsuranceProvider.findByPk(providerId);
    if (!provider) throw new Error('Insurance provider not found');
    await provider.destroy();
    return true;
  }
};
