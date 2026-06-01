import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';

export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  LAB_RESULT = 'lab_result',
  EMERGENCY = 'emergency',
  SYSTEM_ALERT = 'system_alert',
  PAYMENT_STATUS = 'payment_status'
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  tenantId: string;
  userId?: string;
  data?: any;
  timestamp: string;
}

export class NotificationService {
  private static io: SocketIOServer;
  private static notifications: Map<string, Notification[]> = new Map();

  static initialize(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    this.io.on('connection', (socket) => {
      socket.on('join_tenant', (tenantId: string) => {
        socket.join(`tenant_${tenantId}`);
      });

      socket.on('join_user', (userId: string) => {
        socket.join(`user_${userId}`);
      });
    });
  }

  static async sendNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const fullNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    // Store notification
    const tenantNotifications = this.notifications.get(notification.tenantId) || [];
    tenantNotifications.push(fullNotification);
    this.notifications.set(notification.tenantId, tenantNotifications.slice(-100)); // Keep last 100

    // Send real-time notification
    if (notification.userId) {
      this.io.to(`user_${notification.userId}`).emit('notification', fullNotification);
    } else {
      this.io.to(`tenant_${notification.tenantId}`).emit('notification', fullNotification);
    }

    return fullNotification;
  }

  static getNotifications(tenantId: string, userId?: string) {
    const tenantNotifications = this.notifications.get(tenantId) || [];
    if (userId) {
      return tenantNotifications.filter(n => !n.userId || n.userId === userId);
    }
    return tenantNotifications;
  }
}