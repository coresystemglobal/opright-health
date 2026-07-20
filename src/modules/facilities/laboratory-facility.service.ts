import { Laboratory } from '@modules/facilities/laboratory-facility.model';

/** Tenant-scoped CRUD for a tenant's own laboratory facility profile(s). */
export const laboratoryFacilityService = {
  create: async (data: any, tenantId: string) => {
    return Laboratory.create({ ...data, tenant_id: tenantId } as any);
  },

  list: async (tenantId: string, opts: { page: number; limit: number }) => {
    const offset = (opts.page - 1) * opts.limit;
    const { count, rows } = await Laboratory.findAndCountAll({
      where: { tenant_id: tenantId },
      limit: opts.limit,
      offset,
      order: [['name', 'ASC']]
    });
    return { items: rows, total: count };
  },

  getById: async (id: string, tenantId: string) => {
    return Laboratory.findOne({ where: { id, tenant_id: tenantId } });
  },

  update: async (id: string, data: any, tenantId: string) => {
    const lab = await Laboratory.findOne({ where: { id, tenant_id: tenantId } });
    if (!lab) return null;
    const safe: any = { ...data };
    delete safe.tenant_id; // never reassign ownership
    delete safe.id;
    await lab.update(safe);
    return lab;
  },

  remove: async (id: string, tenantId: string) => {
    const lab = await Laboratory.findOne({ where: { id, tenant_id: tenantId } });
    if (!lab) return false;
    await lab.destroy();
    return true;
  }
};
