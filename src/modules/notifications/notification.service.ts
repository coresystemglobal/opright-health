import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { NotificationType } from '@modules/notifications/notification.model';

// Re-exported for backward compatibility with existing callers.
export { NotificationType };

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
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    this.io.on('connection', (socket) => {
      socket.on('join_tenant', (tenantId: string) => socket.join(`tenant_${tenantId}`));
      socket.on('join_user', (userId: string) => socket.join(`user_${userId}`));
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
