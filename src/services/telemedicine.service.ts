import { v4 as uuidv4 } from 'uuid';
import { NotificationService, NotificationType } from './notification.service';

interface VideoSession {
  sessionId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  tenantId: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  recordingUrl?: string;
  chatHistory: ChatMessage[];
  vitalsShared: VitalReading[];
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'doctor' | 'patient';
  message: string;
  timestamp: Date;
  type: 'text' | 'file' | 'vital_reading';
}

interface VitalReading {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight';
  value: any;
  timestamp: Date;
  deviceId?: string;
}

interface PrescriptionData {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export class TelemedicineService {
  private static sessions: Map<string, VideoSession> = new Map();
  private static readonly WEBRTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  static async createVideoSession(appointmentId: string, doctorId: string, patientId: string, tenantId: string): Promise<VideoSession> {
    const sessionId = uuidv4();
    
    const session: VideoSession = {
      sessionId,
      appointmentId,
      doctorId,
      patientId,
      tenantId,
      status: 'scheduled',
      chatHistory: [],
      vitalsShared: []
    };

    this.sessions.set(sessionId, session);

    // Notify participants
    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: 'Telemedicine Session Scheduled',
      message: 'Your video consultation has been scheduled',
      tenantId,
      userId: patientId,
      data: { sessionId, appointmentId }
    });

    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: 'Telemedicine Session Scheduled',
      message: 'Video consultation scheduled with patient',
      tenantId,
      userId: doctorId,
      data: { sessionId, appointmentId }
    });

    return session;
  }

  static async startVideoSession(sessionId: string, userId: string): Promise<{ session: VideoSession; webrtcConfig: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (userId !== session.doctorId && userId !== session.patientId) {
      throw new Error('Unauthorized access to session');
    }

    if (session.status === 'scheduled') {
      session.status = 'active';
      session.startTime = new Date();
      
      // Notify other participant that session is starting
      const otherUserId = userId === session.doctorId ? session.patientId : session.doctorId;
      await NotificationService.sendNotification({
        type: NotificationType.SYSTEM_ALERT,
        title: 'Video Session Starting',
        message: 'Your video consultation is starting',
        tenantId: session.tenantId,
        userId: otherUserId,
        data: { sessionId }
      });
    }

    return {
      session,
      webrtcConfig: this.WEBRTC_CONFIG
    };
  }

  static async endVideoSession(sessionId: string, userId: string): Promise<VideoSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (userId !== session.doctorId && userId !== session.patientId) {
      throw new Error('Unauthorized access to session');
    }

    session.status = 'completed';
    session.endTime = new Date();

    // Update appointment status
    await this.updateAppointmentAfterSession(session);

    return session;
  }

  static async sendChatMessage(sessionId: string, senderId: string, message: string, type: 'text' | 'file' = 'text'): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const senderType = senderId === session.doctorId ? 'doctor' : 'patient';
    
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      senderId,
      senderType,
      message,
      timestamp: new Date(),
      type
    };

    session.chatHistory.push(chatMessage);

    // Notify other participant
    const otherUserId = senderId === session.doctorId ? session.patientId : session.doctorId;
    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: 'New Message',
      message: `New message from ${senderType}`,
      tenantId: session.tenantId,
      userId: otherUserId,
      data: { sessionId, message: chatMessage }
    });

    return chatMessage;
  }

  static async shareVitalReading(sessionId: string, vitalReading: VitalReading): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.vitalsShared.push(vitalReading);

    // Notify doctor about new vital reading
    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: 'Vital Signs Shared',
      message: `Patient shared ${vitalReading.type} reading: ${vitalReading.value}`,
      tenantId: session.tenantId,
      userId: session.doctorId,
      data: { sessionId, vitalReading }
    });
  }

  static async createDigitalPrescription(sessionId: string, doctorId: string, prescriptionData: PrescriptionData): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (doctorId !== session.doctorId) {
      throw new Error('Only the attending doctor can create prescriptions');
    }

    const prescription = {
      id: uuidv4(),
      sessionId,
      patientId: session.patientId,
      doctorId,
      ...prescriptionData,
      createdAt: new Date(),
      status: 'active'
    };

    // In a real implementation, this would be stored in the database
    console.log('Digital prescription created:', prescription);

    // Notify patient
    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: 'Prescription Available',
      message: `New prescription for ${prescriptionData.medication} is available`,
      tenantId: session.tenantId,
      userId: session.patientId,
      data: { prescription }
    });

    return prescription;
  }

  static async scheduleFollowUp(sessionId: string, doctorId: string, followUpDate: Date, notes?: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (doctorId !== session.doctorId) {
      throw new Error('Only the attending doctor can schedule follow-ups');
    }

    // In a real implementation, this would create an appointment
    const followUp = {
      id: uuidv4(),
      originalSessionId: sessionId,
      patientId: session.patientId,
      doctorId,
      scheduledDate: followUpDate,
      notes,
      type: 'telemedicine_followup',
      createdAt: new Date()
    };

    // Notify patient
    await NotificationService.sendNotification({
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Follow-up Scheduled',
      message: `Follow-up telemedicine appointment scheduled for ${followUpDate.toDateString()}`,
      tenantId: session.tenantId,
      userId: session.patientId,
      data: { followUp }
    });

    return followUp;
  }

  static getSession(sessionId: string): VideoSession | undefined {
    return this.sessions.get(sessionId);
  }

  static getActiveSessions(tenantId: string): VideoSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.tenantId === tenantId && session.status === 'active'
    );
  }

  static async getSessionHistory(patientId: string, tenantId: string): Promise<VideoSession[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.patientId === patientId && 
                 session.tenantId === tenantId && 
                 session.status === 'completed'
    );
  }

  private static async updateAppointmentAfterSession(session: VideoSession): Promise<void> {
    // Update the appointment status and add session notes
    const sessionSummary = {
      sessionDuration: session.endTime && session.startTime ? 
        Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000) : 0,
      chatMessages: session.chatHistory.length,
      vitalsShared: session.vitalsShared.length,
      sessionId: session.sessionId
    };

    // In a real implementation, update the appointment record
    console.log('Updating appointment with session summary:', sessionSummary);
  }

  // WebRTC signaling support
  static async handleSignalingMessage(sessionId: string, userId: string, message: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Forward signaling message to other participant
    const otherUserId = userId === session.doctorId ? session.patientId : session.doctorId;
    
    await NotificationService.sendNotification({
      type: NotificationType.SYSTEM_ALERT,
      title: 'WebRTC Signaling',
      message: 'WebRTC signaling message',
      tenantId: session.tenantId,
      userId: otherUserId,
      data: { 
        sessionId, 
        signaling: message,
        from: userId
      }
    });
  }
}