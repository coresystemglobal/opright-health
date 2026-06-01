import axios from 'axios';
import { Patient } from '../models/patient.model';
import { Appointment } from '../models/appointment.model';
import sequelize from '../core/database';
import { QueryTypes } from 'sequelize';

interface PredictionRequest {
  patientData: any;
  historicalData: any[];
  predictionType: 'risk_assessment' | 'readmission' | 'no_show' | 'resource_demand';
}

interface PredictionResponse {
  prediction: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export class MLPredictionService {
  private static readonly ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

  static async predictPatientRisk(patientId: string): Promise<PredictionResponse> {
    const patient = await Patient.findByPk(patientId, {
      include: ['appointments']
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const patientData = {
      age: patient.age,
      gender: patient.gender,
      appointmentHistory: patient.appointments?.length || 0,
      lastVisit: patient.appointments?.[0]?.appointment_date
    };

    try {
      const response = await axios.post(`${this.ML_API_URL}/predict/risk`, {
        patientData,
        predictionType: 'risk_assessment'
      });

      return response.data as PredictionResponse;
    } catch (error) {
      // Fallback to rule-based prediction
      return this.ruleBasedRiskAssessment(patientData);
    }
  }

  static async predictNoShowProbability(appointmentId: string): Promise<PredictionResponse> {
    const appointment = await Appointment.findByPk(appointmentId, {
      include: ['patient']
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const features = {
      dayOfWeek: new Date(appointment.appointment_date).getDay(),
      timeOfDay: parseInt(appointment.appointment_time.split(':')[0]),
      patientAge: appointment.patient?.age,
      appointmentType: appointment.appointment_type,
      leadTime: Math.floor((new Date(appointment.appointment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    };

    try {
      const response = await axios.post(`${this.ML_API_URL}/predict/no-show`, {
        features,
        predictionType: 'no_show'
      });

      return response.data as PredictionResponse;
    } catch (error) {
      return this.ruleBasedNoShowPrediction(features);
    }
  }

  static async predictResourceDemand(tenantId: string, date: Date): Promise<any> {
    const historicalData = await this.getHistoricalResourceUsage(tenantId, date);

    try {
      const response = await axios.post(`${this.ML_API_URL}/predict/demand`, {
        historicalData,
        targetDate: date,
        predictionType: 'resource_demand'
      });

      return response.data;
    } catch (error) {
      return this.ruleBasedDemandPrediction(historicalData);
    }
  }

  static async generateHealthInsights(patientId: string): Promise<any[]> {
    const patient = await Patient.findByPk(patientId, {
      include: ['appointments']
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Simplified health insights
    const insights = [];

    if (patient.age > 65) {
      insights.push({
        type: 'age_risk',
        message: 'Patient is in high-risk age group for chronic conditions',
        priority: 'medium',
        recommendations: ['Regular health screenings', 'Preventive care focus']
      });
    }

    const recentAppointments = patient.appointments?.filter(apt => 
      new Date(apt.appointment_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ) || [];

    if (recentAppointments.length > 5) {
      insights.push({
        type: 'frequent_visits',
        message: 'Patient has frequent appointments - may indicate chronic condition',
        priority: 'high',
        recommendations: ['Care coordination', 'Chronic disease management program']
      });
    }

    return insights;
  }

  private static ruleBasedRiskAssessment(patientData: any): PredictionResponse {
    let risk = 0.3; // Base risk
    const factors = [];

    if (patientData.age > 65) {
      risk += 0.2;
      factors.push('Advanced age');
    }

    if (patientData.appointmentHistory > 10) {
      risk += 0.15;
      factors.push('Frequent medical visits');
    }

    return {
      prediction: Math.min(risk, 1.0),
      confidence: 0.65,
      factors,
      recommendations: risk > 0.7 ? ['Enhanced monitoring', 'Preventive care'] : ['Regular checkups']
    };
  }

  private static ruleBasedNoShowPrediction(features: any): PredictionResponse {
    let probability = 0.15; // Base no-show rate

    if (features.dayOfWeek === 1) probability += 0.1; // Monday
    if (features.timeOfDay < 9) probability += 0.05; // Early morning
    if (features.leadTime > 30) probability += 0.1; // Far in advance

    return {
      prediction: Math.min(probability, 1.0),
      confidence: 0.7,
      factors: ['Day of week', 'Time of day', 'Lead time'],
      recommendations: probability > 0.3 ? ['Send reminder', 'Confirm appointment'] : ['Standard follow-up']
    };
  }

  private static ruleBasedDemandPrediction(historicalData: any[]): any {
    const avgDemand = historicalData.reduce((sum, day) => sum + day.appointments, 0) / historicalData.length;
    
    return {
      predictedAppointments: Math.round(avgDemand * 1.1),
      predictedStaffNeeded: Math.ceil(avgDemand / 8),
      confidence: 0.6,
      recommendations: ['Standard staffing levels']
    };
  }

  private static async getHistoricalResourceUsage(tenantId: string, targetDate: Date) {
    // Get last 30 days of data for the same day of week
    const dayOfWeek = targetDate.getDay();
    const thirtyDaysAgo = new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const query = `
      SELECT 
        appointment_date,
        COUNT(*) as appointments,
        COUNT(DISTINCT doctor_id) as doctors_used
      FROM appointments 
      WHERE tenant_id = :tenantId 
        AND appointment_date BETWEEN :start AND :end
        AND EXTRACT(DOW FROM appointment_date) = :dayOfWeek
      GROUP BY appointment_date
      ORDER BY appointment_date
    `;

    return sequelize.query(query, {
      replacements: { tenantId, start: thirtyDaysAgo, end: targetDate, dayOfWeek },
      type: QueryTypes.SELECT
    });
  }
}