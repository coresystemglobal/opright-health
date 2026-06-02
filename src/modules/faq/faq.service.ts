import { FAQ } from '@modules/faq/faq.model';

import { Op } from 'sequelize';

export class FAQService {
  static async getAll(tenantId?: string, category?: string) {
    const where: any = { is_active: true };
    
    if (tenantId) where.tenant_id = tenantId;
    if (category) where.category = category;

    return FAQ.findAll({
      where,
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  static async getById(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId) where.tenant_id = tenantId;

    return FAQ.findOne({ where });
  }

  static async create(data: any) {
    return FAQ.create(data);
  }

  static async update(id: string, data: any, tenantId?: string) {
    const where: any = { id };
    if (tenantId) where.tenant_id = tenantId;

    await FAQ.update(data, { where });
    return this.getById(id, tenantId);
  }

  static async delete(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId) where.tenant_id = tenantId;

    return FAQ.destroy({ where });
  }

  static async search(query: string, tenantId?: string) {
    const where: any = {
      is_active: true,
      [Op.or]: [
        { question: { [Op.iLike]: `%${query}%` } },
        { answer: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (tenantId) where.tenant_id = tenantId;

    return FAQ.findAll({
      where,
      order: [['sort_order', 'ASC']]
    });
  }

  static async getCategories(tenantId?: string) {
    const where: any = { is_active: true };
    if (tenantId) where.tenant_id = tenantId;

    const result = await FAQ.findAll({
      where,
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    return result.map(faq => faq.category);
  }
}