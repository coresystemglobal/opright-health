import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { NotificationType } from '@modules/notifications/notification.model';
import { verifyAccessToken, bearerFrom } from '@security/token';
import { loadPrincipal } from '@security/permissions';

// Re-exported for backward compatibility with existing callers.
export { NotificationType };

/** Identity established during the handshake and trusted thereafter. */
interface SocketIdentity {
  userId: string;
  tenantId?: string;
}

/**
 * Origins permitted to open a socket. FRONTEND_URL in every environment, plus
 * local dev hosts outside production.
 */
function allowedSocketOrigins(): string[] {
  return [
    process.env.FRONTEND_URL,
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
      : [])
  ].filter(Boolean) as string[];
}

interface LegacyNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  tenantId: string;
  userId?: string;
  data?: any;
}

/**
 * Socket.IO transport for in-app notifications. Persistence and multi-channel
 * fan-out live in notification-dispatcher.service; this class owns the
 * real-time socket layer plus a backward-compatible sendNotification() shim.
 */
export class NotificationService {
  private static io: SocketIOServer | null = null;

  static initialize(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        // Never '*': notification payloads carry PHI, and a wildcard lets any
        // page on the internet open an authenticated cross-origin socket.
        origin: allowedSocketOrigins(),
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    /**
     * Handshake authentication (audit finding C-6).
     *
     * Previously any anonymous client could connect and then name whichever
     * room it wanted via `join_tenant` / `join_user`, receiving another
     * tenant's clinical notification stream. Rooms are now derived from the
     * verified token and never accepted from the client.
     */
    this.io.use(async (socket, nextFn) => {
      const raw =
        (socket.handshake.auth as any)?.token ||
        bearerFrom(socket.handshake.headers.authorization);

      const verified = verifyAccessToken(raw);
      if (!verified.ok) {
        return nextFn(new Error(`unauthorised: ${verified.reason}`));
      }

      try {
        // The database is authoritative for tenant membership, so a socket
        // cannot outlive a tenant move by trusting a stale token claim.
        const principal = await loadPrincipal(verified.payload.userId);
        const identity: SocketIdentity = {
          userId: verified.payload.userId,
          tenantId: principal.tenantId
        };
        socket.data = identity;
        return nextFn();
      } catch {
        // Identity store unavailable: refuse the connection rather than admit
        // a socket whose tenant we could not establish.
        return nextFn(new Error('unauthorised: identity unavailable'));
      }
    });

    this.io.on('connection', (socket) => {
      const { userId, tenantId } = socket.data as SocketIdentity;

      // Joined server-side from the verified identity. There is deliberately
      // no client-controlled join: a socket can only ever be in its own rooms.
      socket.join(`user_${userId}`);
      if (tenantId) socket.join(`tenant_${tenantId}`);

      // Legacy no-ops. Older clients emit these; honouring the argument would
      // reintroduce the vulnerability, so we acknowledge and ignore it.
      const refuseClientJoin = (requested: string) => {
        if (requested && requested !== userId && requested !== tenantId) {
          console.warn(
            `[socket] ignored join request for '${requested}' from user ${userId}`
          );
        }
      };
      socket.on('join_tenant', refuseClientJoin);
      socket.on('join_user', refuseClientJoin);
    });
  }

  /** Emit a real-time event to a single user's room. */
  static emitToUser(userId: string, event: any): void {
    this.io?.to(`user_${userId}`).emit('notification', event);
  }

  /** Emit a real-time event to every socket joined to a tenant. */
  static emitToTenant(tenantId: string, event: any): void {
    this.io?.to(`tenant_${tenantId}`).emit('notification', event);
  }

  static isInitialized(): boolean {
    return this.io !== null;
  }

  /**
   * Backward-compatible entry point. Existing callers (integrations, mobile)
   * invoke this; it now persists the notification and fans out across the
   * user's enabled channels via the dispatcher. Dynamic import breaks the
   * dispatcher↔service require cycle.
   */
  static async sendNotification(input: LegacyNotificationInput) {
    const { dispatchNotification } = await import('@modules/notifications/notification-dispatcher.service');
    return dispatchNotification({
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data
    });
  }
}
