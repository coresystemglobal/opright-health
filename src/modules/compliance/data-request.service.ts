import { Op } from 'sequelize';
import { DataSubjectRequest, Patient } from '../../models';
import { DataRequestType, DataRequestStatus } from '@modules/compliance/data-subject-request.model';
import { complianceService } from '@modules/compliance/compliance.service';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateRequestData {
  patient_id: string;
  request_type: DataRequestType;
  reason?: string;
  tenant_id: string;
}

const patientInclude = { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'mrn', 'is_anonymized'] };

export const dataRequestService = {
  createRequest: async (data: CreateRequestData) => {
    const { patient_id, request_type, tenant_id } = data;
    if (!patient_id || !request_type || !tenant_id) throw new Error('patient_id, request_type, and tenant context are required');
    if (!ValidationUtil.isValidUUID(patient_id)) throw new Error('Invalid patient ID format');

    const patient = await Patient.findByPk(patient_id);
    if (!patient) throw new Error('Patient not found');
    if ((patient as any).tenant_id !== tenant_id) throw new Error('Patient does not belong to this tenant');

    return DataSubjectRequest.create({
      patient_id,
      request_type,
      status: DataRequestStatus.PENDING,
      reason: data.reason || null,
      requested_at: new Date(),
      tenant_id
    } as any);
  },

  listRequests: async (tenantId: string, paginationQuery: PaginationQuery, filters: { status?: DataRequestStatus; request_type?: DataRequestType; patient_id?: string } = {}) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.request_type) where.request_type = filters.request_type;
    if (filters.patient_id) where.patient_id = filters.patient_id;

    const { count, rows: requests } = await DataSubjectRequest.findAndCountAll({
      where,
      include: [patientInclude],
      order: [['requested_at', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      distinct: true
    });
    return { requests, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getRequestById: async (requestId: string) => {
    if (!ValidationUtil.isValidUUID(requestId)) throw new Error('Invalid request ID format');
    const request = await DataSubjectRequest.findByPk(requestId, { include: [patientInclude] });
    if (!request) throw new Error('Request not found');
    return request;
  },

  /**
   * Advance a request's status. Completing an ERASURE request triggers
   * anonymization of the patient's direct identifiers. Completing an ACCESS
   * request is a bookkeeping step (the export is fetched separately).
   */
  updateStatus: async (requestId: string, status: DataRequestStatus, handledBy: string, resultNotes?: string) => {
    if (!ValidationUtil.isValidUUID(requestId)) throw new Error('Invalid request ID format');
    const request = await DataSubjectRequest.findByPk(requestId);
    if (!request) throw new Error('Request not found');
    if ([DataRequestStatus.COMPLETED, DataRequestStatus.REJECTED].includes(request.status)) {
      throw new Error(`Request is already ${request.status}`);
    }

    let anonymizeResult: any = null;
    if (status === DataRequestStatus.COMPLETED && request.request_type === DataRequestType.ERASURE) {
      // Perform the erasure as part of completing the request
      anonymizeResult = await complianceService.anonymizePatient(request.patient_id, request.tenant_id).catch((e: Error) => {
        throw new Error(`Cannot complete erasure: ${e.message}`);
      });
    }

    await request.update({
      status,
      handled_by: handledBy,
      result_notes: resultNotes || request.result_notes,
      completed_at: [DataRequestStatus.COMPLETED, DataRequestStatus.REJECTED].includes(status) ? new Date() : request.completed_at
    });

    return { request, anonymizeResult };
  },

  /**
   * Retention preview: patients with no update in `years` who are not yet
   * anonymized — candidates for retention review/purge. Read-only; purging
   * is a deliberate, separately-authorized action.
   */
  retentionPreview: async (tenantId: string, years: number) => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);

    const candidates = await Patient.findAll({
      where: {
        tenant_id: tenantId,
        is_anonymized: false,
        updatedAt: { [Op.lt]: cutoff }
      } as any,
      attributes: ['id', 'mrn', 'first_name', 'last_name', 'updatedAt'],
      order: [['updatedAt', 'ASC']],
      limit: 500
    });

    return {
      retention_years: years,
      cutoff: cutoff.toISOString(),
      candidate_count: candidates.length,
      candidates,
      note: candidates.length >= 500 ? 'Showing first 500 candidates' : undefined
    };
  }
};
