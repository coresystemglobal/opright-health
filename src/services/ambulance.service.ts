import { Ambulance, AmbulanceStatus } from '../models/ambulance.model';
import { AmbulanceRequest, RequestStatus, EmergencyLevel } from '../models/ambulance-request.model';
import { QueueManagementService } from './queue-management.service';
import { QueuePriority } from '../models/queue.model';
import { Patient } from '../models/patient.model';
import { Op } from 'sequelize';

const queueService = new QueueManagementService();

export class AmbulanceService {
  async requestAmbulance(data: {
    pickupLocation: string;
    pickupLatitude: number;
    pickupLongitude: number;
    emergencyDetails: string;
    emergencyLevel: EmergencyLevel;
    callerPhone: string;
    patientId?: string;
  }) {
    const request = await AmbulanceRequest.create({
      pickup_location: data.pickupLocation,
      pickup_latitude: data.pickupLatitude,
      pickup_longitude: data.pickupLongitude,
      emergency_details: data.emergencyDetails,
      emergency_level: data.emergencyLevel,
      caller_phone: data.callerPhone,
      patient_id: data.patientId,
      status: RequestStatus.PENDING
    });

    const ambulance = await this.findNearestAvailableAmbulance(data.pickupLatitude, data.pickupLongitude);
    
    if (ambulance) {
      await this.dispatchAmbulance(request.id, ambulance.id);
    }

    return request;
  }

  async dispatchAmbulance(requestId: string, ambulanceId: string) {
    const request = await AmbulanceRequest.findByPk(requestId);
    const ambulance = await Ambulance.findByPk(ambulanceId);

    if (!request || !ambulance) throw new Error('Request or ambulance not found');

    request.ambulance_id = ambulanceId;
    request.status = RequestStatus.DISPATCHED;
    request.dispatched_at = new Date();
    request.eta_minutes = 15;
    await request.save();

    ambulance.status = AmbulanceStatus.EN_ROUTE;
    await ambulance.save();

    return { request, ambulance };
  }

  async updateStatus(requestId: string, status: RequestStatus, location?: { lat: number; lng: number }) {
    const request = await AmbulanceRequest.findByPk(requestId, { include: [Ambulance] });
    if (!request) throw new Error('Request not found');

    request.status = status;

    if (status === RequestStatus.ARRIVED) {
      request.arrived_at = new Date();
      if (request.ambulance) request.ambulance.status = AmbulanceStatus.AT_SCENE;
    } else if (status === RequestStatus.TRANSPORTING) {
      if (request.ambulance) request.ambulance.status = AmbulanceStatus.TRANSPORTING;
    } else if (status === RequestStatus.COMPLETED) {
      request.completed_at = new Date();
      if (request.ambulance) request.ambulance.status = AmbulanceStatus.AVAILABLE;
      
      if (request.patient_id) {
        const priority = request.emergency_level === EmergencyLevel.CRITICAL 
          ? QueuePriority.EMERGENCY 
          : QueuePriority.URGENT;
        await queueService.checkIn(request.patient_id, 'Emergency', priority);
      }
    }

    await request.save();
    if (request.ambulance) await request.ambulance.save();

    if (location && request.ambulance) {
      request.ambulance.current_latitude = location.lat;
      request.ambulance.current_longitude = location.lng;
      await request.ambulance.save();
    }

    return request;
  }

  async getActiveRequests() {
    return await AmbulanceRequest.findAll({
      where: {
        status: {
          [Op.in]: [RequestStatus.PENDING, RequestStatus.DISPATCHED, RequestStatus.ARRIVED, RequestStatus.TRANSPORTING]
        }
      },
      include: [Patient, Ambulance],
      order: [['created_at', 'DESC']]
    });
  }

  async getAvailableAmbulances() {
    return await Ambulance.findAll({
      where: { status: AmbulanceStatus.AVAILABLE }
    });
  }

  private async findNearestAvailableAmbulance(lat: number, lng: number) {
    const available = await this.getAvailableAmbulances();
    if (!available.length) return null;
    return available[0];
  }
}
