import { patientService } from '@modules/patients/patient.service';
import { appointmentService } from '@modules/appointments/appointment.service';
import { prescriptionService } from '@modules/clinical/prescription.service';
import { invoiceService } from '@modules/billing/invoice.service';
import { LaboratoryService } from '@modules/laboratory/laboratory.service';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';

/**
 * Patient self-service portal.
 *
 * Every method resolves the *authenticated* patient from their user id and
 * scopes data access to that patient, so a signed-in patient can only ever
 * read their own records. Reuses the domain services rather than
 * re-querying, keeping business rules in one place.
 */
export const patientPortalService = {
  /** Resolve the patient owned by the authenticated user (throws if none). */
  resolvePatient: async (userId: string, tenantId: string) => {
    // getPatientByUserId throws 'Patient profile not found' when absent
    return patientService.getPatientByUserId(userId, tenantId);
  },

  getProfile: async (userId: string, tenantId: string) => {
    return patientPortalService.resolvePatient(userId, tenantId);
  },

  getAppointments: async (userId: string, tenantId: string, paginationQuery: PaginationQuery, status?: string) => {
    const patient: any = await patientPortalService.resolvePatient(userId, tenantId);
    return appointmentService.getPatientAppointments(patient.id, paginationQuery, status);
  },

  getPrescriptions: async (userId: string, tenantId: string, paginationQuery: PaginationQuery, status?: any) => {
    const patient: any = await patientPortalService.resolvePatient(userId, tenantId);
    return prescriptionService.getPatientPrescriptions(patient.id, paginationQuery, status);
  },

  getInvoices: async (userId: string, tenantId: string, paginationQuery: PaginationQuery, status?: string) => {
    const patient: any = await patientPortalService.resolvePatient(userId, tenantId);
    return invoiceService.getPatientInvoices(patient.id, paginationQuery, status);
  },

  getLabResults: async (userId: string, tenantId: string, paginationQuery: PaginationQuery) => {
    const patient: any = await patientPortalService.resolvePatient(userId, tenantId);
    const options = PaginationUtil.parsePaginationQuery(paginationQuery);
    const { orders, total } = await LaboratoryService.getTestOrdersByPatient(patient.id, tenantId, {
      page: options.page,
      limit: options.limit,
      offset: options.offset
    });
    return { orders, count: total, page: options.page, limit: options.limit };
  },

  /**
   * Portal landing summary — a few headline counts the patient home screen
   * needs, resolved in one call.
   */
  getDashboard: async (userId: string, tenantId: string) => {
    const patient: any = await patientPortalService.resolvePatient(userId, tenantId);
    const pageOne: PaginationQuery = { page: '1', limit: '5' };

    const [appointments, prescriptions, invoices, labs] = await Promise.all([
      appointmentService.getPatientAppointments(patient.id, pageOne, 'scheduled').catch(() => ({ count: 0, appointments: [] } as any)),
      prescriptionService.getPatientPrescriptions(patient.id, pageOne).catch(() => ({ count: 0, prescriptions: [] } as any)),
      invoiceService.getPatientInvoices(patient.id, pageOne).catch(() => ({ count: 0, invoices: [] } as any)),
      LaboratoryService.getTestOrdersByPatient(patient.id, tenantId, { page: 1, limit: 5, offset: 0 }).catch(() => ({ total: 0, orders: [] } as any))
    ]);

    return {
      patient: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        mrn: patient.mrn
      },
      summary: {
        upcoming_appointments: appointments.count ?? 0,
        prescriptions: prescriptions.count ?? 0,
        invoices: invoices.count ?? 0,
        lab_orders: labs.total ?? 0
      },
      upcoming_appointments: appointments.appointments ?? [],
      recent_prescriptions: prescriptions.prescriptions ?? [],
      recent_invoices: invoices.invoices ?? [],
      recent_lab_orders: labs.orders ?? []
    };
  }
};
