import { Op } from 'sequelize';
import { VisitorLog, VisitorStatus, VisitPurpose, VisitorIdType } from './visitor-log.model';
import { Patient } from '@modules/patients/patient.model';
import { PaginationUtil } from '@utils/pagination.util';
import { PaginationQuery } from '@appTypes/common.types';
import { sanitizeInput } from '@utils/validator';

interface CheckInData {
  tenant_id: string;
  visitor_name: string;
  visitor_phone: string;
  id_type?: VisitorIdType;
  id_number?: string;
  host_name: string;
  patient_id?: string;
  purpose?: VisitPurpose;
  ward_or_location?: string;
  badge_number?: string;
  notes?: string;
}

export const visitorLogService = {
  checkIn: async (data: CheckInData): Promise<VisitorLog> => {
    const visitor = await VisitorLog.create({
      ...data,
      visitor_name: sanitizeInput(data.visitor_name),
      visitor_phone: sanitizeInput(data.visitor_phone),
      host_name: sanitizeInput(data.host_name),
      entry_time: new Date(),
      status: VisitorStatus.CHECKED_IN
    });
    return visitor;
  },

  checkOut: async (id: string, tenantId: string): Promise<VisitorLog> => {
    const visitor = await VisitorLog.findOne({ where: { id, tenant_id: tenantId } });
    if (!visitor) throw new Error('Visitor record not found');
    if (visitor.status === VisitorStatus.CHECKED_OUT) throw new Error('Visitor already checked out');

    await visitor.update({ status: VisitorStatus.CHECKED_OUT, exit_time: new Date() });
    return visitor;
  },

  lookupByPhone: async (phone: string, tenantId: string): Promise<VisitorLog[]> => {
    const sanitized = sanitizeInput(phone.trim());
    return VisitorLog.findAll({
      where: {
        tenant_id: tenantId,
        visitor_phone: sanitized,
        status: VisitorStatus.CHECKED_IN
      },
      order: [['entry_time', 'DESC']],
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'], required: false }]
    });
  },

  getAll: async (paginationQuery: PaginationQuery, tenantId: string, status?: string, search?: string) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: Record<string, unknown> = { tenant_id: tenantId };

    if (status && Object.values(VisitorStatus).includes(status as VisitorStatus)) {
      where.status = status;
    }

    if (search) {
      const s = sanitizeInput(search.trim());
      Object.assign(where, {
        [Op.or]: [
          { visitor_name: { [Op.iLike]: `%${s}%` } },
          { visitor_phone: { [Op.iLike]: `%${s}%` } },
          { host_name: { [Op.iLike]: `%${s}%` } }
        ]
      });
    }

    const { count, rows } = await VisitorLog.findAndCountAll({
      where,
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'], required: false }],
      order: [['entry_time', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions)
    });

    return { visitors: rows, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getActiveVisitors: async (tenantId: string): Promise<VisitorLog[]> => {
    return VisitorLog.findAll({
      where: { tenant_id: tenantId, status: VisitorStatus.CHECKED_IN },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'], required: false }],
      order: [['entry_time', 'DESC']]
    });
  },

  getById: async (id: string, tenantId: string): Promise<VisitorLog> => {
    const visitor = await VisitorLog.findOne({
      where: { id, tenant_id: tenantId },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn'], required: false }]
    });
    if (!visitor) throw new Error('Visitor record not found');
    return visitor;
  }
};
