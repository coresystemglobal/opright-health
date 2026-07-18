import { Response } from 'express';
import { AnalyticsService } from '@modules/reports/analytics.service';

import { MLPredictionService } from '@modules/reports/ml-prediction.service';

import { IoTDeviceService } from '@modules/integrations/iot-device.service';

import { WorkflowAutomationService } from '@modules/integrations/workflow-automation.service';

import { TelemedicineService } from '@modules/integrations/telemedicine.service';

import { ResponseUtil } from '@utils/response.util';
import { TenantRequest } from '@middlewares/tenant.middleware';

export class AdvancedFeaturesController {
  // Analytics endpoints
  static async getAnalytics(req: TenantRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const analytics = await AnalyticsService.getAdvancedAnalytics(req.tenant!.id, dateRange);
      return ResponseUtil.success(res, analytics, 'Analytics retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getRealtimeMetrics(req: TenantRequest, res: Response) {
    try {
      const metrics = await AnalyticsService.getRealtimeMetrics(req.tenant!.id);
      return ResponseUtil.success(res, metrics, 'Real-time metrics retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  // ML Prediction endpoints
  static async predictPatientRisk(req: TenantRequest, res: Response) {
    try {
      const { patientId } = req.params;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      const prediction = await MLPredictionService.predictPatientRisk(patientId, tenantId);
      return ResponseUtil.success(res, prediction, 'Risk prediction completed');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async predictNoShow(req: TenantRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const prediction = await MLPredictionService.predictNoShowProbability(appointmentId);
      return ResponseUtil.success(res, prediction, 'No-show prediction completed');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  // IoT Device endpoints
  static async getDeviceReadings(req: TenantRequest, res: Response) {
    try {
      const { deviceId } = req.params;
      const { limit } = req.query;
      
      const iotService = IoTDeviceService.getInstance();
      const readings = iotService.getDeviceReadings(deviceId, parseInt(limit as string) || 100);
      
      return ResponseUtil.success(res, readings, 'Device readings retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getPatientVitals(req: TenantRequest, res: Response) {
    try {
      const { patientId } = req.params;
      
      const iotService = IoTDeviceService.getInstance();
      const vitals = iotService.getPatientVitals(patientId);
      
      return ResponseUtil.success(res, vitals, 'Patient vitals retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  // Workflow endpoints
  static async getWorkflowRules(req: TenantRequest, res: Response) {
    try {
      const rules = WorkflowAutomationService.getActiveRules(req.tenant!.id);
      return ResponseUtil.success(res, rules, 'Workflow rules retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  // Telemedicine endpoints
  static async createVideoSession(req: TenantRequest, res: Response) {
    try {
      const { appointmentId, doctorId, patientId } = req.body;
      
      const session = await TelemedicineService.createVideoSession(
        appointmentId, 
        doctorId, 
        patientId, 
        req.tenant!.id
      );
      
      return ResponseUtil.success(res, session, 'Video session created successfully', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async startVideoSession(req: TenantRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return ResponseUtil.error(res, 'User ID required', 401);
      }
      
      const result = await TelemedicineService.startVideoSession(sessionId, userId);
      return ResponseUtil.success(res, result, 'Video session started successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async sendChatMessage(req: TenantRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { message, type } = req.body;
      const userId = req.user?.userId;
      
      if (!userId) {
        return ResponseUtil.error(res, 'User ID required', 401);
      }
      
      const chatMessage = await TelemedicineService.sendChatMessage(sessionId, userId, message, type);
      return ResponseUtil.success(res, chatMessage, 'Message sent successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}