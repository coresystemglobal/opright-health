import { Pharmacy } from '@modules/facilities/pharmacy-facility.model';

/** Tenant-scoped CRUD for a tenant's own pharmacy facility profile(s). */
export const pharmacyFacilityService = {
  create: async (data: any, tenantId: string) => {
    return Pharmacy.create({ ...data, tenant_id: tenantId } as any);
  },

  list: async (tenantId: string, opts: { page: number; limit: number }) => {
    const offset = (opts.page - 1) * opts.limit;
    const { count, rows } = await Pharmacy.findAndCountAll({
      where: { tenant_id: tenantId },
      limit: opts.limit,
      offset,
      order: [['name', 'ASC']]
    });
    return { items: rows, total: count };
  },

  getById: async (id: string, tenantId: string) => {
    return Pharmacy.findOne({ where: { id, tenant_id: tenantId } });
  },

  update: async (id: string, data: any, tenantId: string) => {
    const pharmacy = await Pharmacy.findOne({ where: { id, tenant_id: tenantId } });
    if (!pharmacy) return null;
    const safe: any = { ...data };
    delete safe.tenant_id; // never reassign ownership
    delete safe.id;
    await pharmacy.update(safe);
    return pharmacy;
  },

  remove: async (id: string, tenantId: string) => {
    const pharmacy = await Pharmacy.findOne({ where: { id, tenant_id: tenantId } });
    if (!pharmacy) return false;
    await pharmacy.destroy();
    return true;
  }
};
