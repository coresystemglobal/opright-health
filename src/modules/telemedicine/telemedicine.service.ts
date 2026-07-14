import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { TelemedicineSession, Patient, Doctor } from '../../models';
import { TelemedicineProvider, TelemedicineStatus } from '@modules/telemedicine/telemedicine-session.model';
import { NotificationService, NotificationType } from '@modules/notifications/notification.service';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';

interface CreateSessionData {
  appointment_id?: string;
  doctor_id: string;
  patient_id: string;
  provider?: TelemedicineProvider;
  scheduled_at?: string | Date;
  notes?: string;
  tenant_id: string;
}

const PARTICIPANT_ATTRS = {
  doctor: ['id', 'first_name', 'last_name'],
  patient: ['id', 'first_name', 'last_name']
};

/**
 * Pluggable video-provider stub. Generates a room name and join/host links.
 * Swap this for a real Daily.co / Twilio / Jitsi client (server-side room
 * creation + signed tokens) without changing the session lifecycle.
 */
export function buildRoomLinks(provider: TelemedicineProvider): { room_name: string; join_url: string; host_url: string } {
  const room = `hms-${uuidv4()}`;
  const base = process.env.TELEMEDICINE_BASE_URL || 'https://telehealth.example';
  switch (provider) {
    case TelemedicineProvider.DAILY_CO:
      return { room_name: room, join_url: `${base}/${room}`, host_url: `${base}/${room}?t=host` };
    case TelemedicineProvider.JITSI:
      return { room_name: room, join_url: `https://meet.jit.si/${room}`, host_url: `https://meet.jit.si/${room}#config.startWithModerator=true` };
    default:
      return { room_name: room, join_url: `${base}/room/${room}`, host_url: `${base}/room/${room}?role=host` };
  }
}

async function notifySafe(input: { title: string; message: string; tenantId: string; data?: any }): Promise<void> {
  try {
    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: input.title,
      message: input.message,
      tenantId: input.tenantId,
      data: input.data
    });
  } catch { /* notifications are best-effort */ }
}

export const telemedicineService = {
  createSession: async (data: CreateSessionData) => {
    const { doctor_id, patient_id, tenant_id } = data;
    if (!doctor_id || !patient_id || !tenant_id) throw new Error('doctor_id, patient_id, and tenant context are required');
    if (!ValidationUtil.isValidUUID(doctor_id) || !ValidationUtil.isValidUUID(patient_id)) throw new Error('Invalid doctor_id or patient_id format');

    const provider = data.provider || TelemedicineProvider.WEBRTC;
    const links = buildRoomLinks(provider);

    const session = await TelemedicineSession.create({
      appointment_id: data.appointment_id || null,
      doctor_id,
      patient_id,
      provider,
      room_name: links.room_name,
      join_url: links.join_url,
      host_url: links.host_url,
      status: TelemedicineStatus.SCHEDULED,
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : null,
      notes: data.notes || null,
      tenant_id
    } as any);

    await notifySafe({
      title: 'Telemedicine session scheduled',
      message: 'A video consultation has been scheduled.',
      tenantId: tenant_id,
      data: { sessionId: session.id, join_url: session.join_url }
    });

    return session;
  },

  listSessions: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { doctor_id?: string; patient_id?: string; status?: TelemedicineStatus; appointment_id?: string; from?: string; to?: string } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.doctor_id) where.doctor_id = filters.doctor_id;
    if (filters.patient_id) where.patient_id = filters.patient_id;
    if (filters.status) where.status = filters.status;
    if (filters.appointment_id) where.appointment_id = filters.appointment_id;
    if (filters.from || filters.to) {
      where.scheduled_at = {};
      if (filters.from) where.scheduled_at[Op.gte] = new Date(filters.from);
      if (filters.to) where.scheduled_at[Op.lte] = new Date(filters.to);
    }
    const { count, rows: sessions } = await TelemedicineSession.findAndCountAll({
      where,
      include: [
        { model: Doctor, attributes: PARTICIPANT_ATTRS.doctor },
        { model: Patient, attributes: PARTICIPANT_ATTRS.patient }
      ],
      order: [['scheduled_at', 'DESC'], ['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { sessions, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getSessionById: async (sessionId: string, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(sessionId)) throw new Error('Invalid session ID format');
    const session = await TelemedicineSession.findByPk(sessionId, {
      include: [
        { model: Doctor, attributes: PARTICIPANT_ATTRS.doctor },
        { model: Patient, attributes: PARTICIPANT_ATTRS.patient }
      ]
    });
    if (!session || session.tenant_id !== tenantId) throw new Error('Telemedicine session not found');
    return session;
  },

  /** scheduled → active */
  startSession: async (sessionId: string, tenantId: string) => {
    const session = await telemedicineService.getSessionById(sessionId, tenantId);
    if (session.status !== TelemedicineStatus.SCHEDULED) throw new Error(`Only scheduled sessions can be started (current status: ${session.status})`);
    await session.update({ status: TelemedicineStatus.ACTIVE, started_at: new Date() });
    await notifySafe({ title: 'Telemedicine session started', message: 'Your video consultation is starting.', tenantId, data: { sessionId: session.id } });
    return session;
  },

  /** active → completed (computes duration) */
  endSession: async (sessionId: string, tenantId: string, opts: { recording_url?: string; notes?: string } = {}) => {
    const session = await telemedicineService.getSessionById(sessionId, tenantId);
    if (session.status !== TelemedicineStatus.ACTIVE) throw new Error(`Only active sessions can be ended (current status: ${session.status})`);
    const endedAt = new Date();
    const duration = session.started_at ? Math.max(1, Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 60000)) : null;
    await session.update({
      status: TelemedicineStatus.COMPLETED,
      ended_at: endedAt,
      duration_minutes: duration,
      recording_url: opts.recording_url ?? session.recording_url,
      notes: opts.notes ?? session.notes
    });
    return session;
  },

  /** scheduled | active → cancelled */
  cancelSession: async (sessionId: string, tenantId: string, reason?: string) => {
    const session = await telemedicineService.getSessionById(sessionId, tenantId);
    if (session.status === TelemedicineStatus.COMPLETED || session.status === TelemedicineStatus.CANCELLED) {
      throw new Error(`A ${session.status} session cannot be cancelled`);
    }
    await session.update({
      status: TelemedicineStatus.CANCELLED,
      notes: reason ? `${session.notes ? session.notes + '\n' : ''}Cancelled: ${reason}` : session.notes
    });
    await notifySafe({ title: 'Telemedicine session cancelled', message: 'A scheduled video consultation was cancelled.', tenantId, data: { sessionId: session.id } });
    return session;
  }
};
