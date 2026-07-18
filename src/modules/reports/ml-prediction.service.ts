import axios from 'axios';
import { Patient } from '@modules/patients/patient.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { Allergy } from '@modules/clinical/allergy.model';

import { Medication } from '@modules/clinical/medication.model';

import { VitalSign } from '@modules/clinical/vital-sign.model';

import { MedicalRecord } from '@modules/clinical/medical-record.model';

import sequelize from '@core/database';
import { QueryTypes } from 'sequelize';

interface PatientRiskData {
  age: number;
  gender: string;
  appointmentHistory: number;
  lastVisit?: Date;
  allergiesCount: number;
  criticalAllergies: number;
  activeMedications: number;
  chronicConditions: string[];
  recentVitals?: {
    bloodPressure?: { systolic: number; diastolic: number };
    bmi?: number;
    hasAbnormalReadings: boolean;
  };
  icd10Codes: string[];
}

interface NoShowFeatures {
  dayOfWeek: number;
  timeOfDay: number;
  patientAge?: number;
  appointmentType: string;
  leadTime: number;
  previousNoShows: number;
  hasReminder: boolean;
}

interface PredictionRequest {
  patientData: PatientRiskData | NoShowFeatures;
  historicalData?: any[];
  predictionType: 'risk_assessment' | 'readmission' | 'no_show' | 'resource_demand';
}

interface PredictionResponse {
  prediction: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

interface ResourceUsageData {
  appointment_date: Date;
  appointments: number;
  doctors_used: number;
}

export class MLPredictionService {
  private static readonly ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';
  private static readonly ML_ENABLED = process.env.ML_ENABLED === 'true';
  
  // Configurable thresholds
  private static readonly THRESHOLDS = {
    HIGH_RISK_AGE: parseInt(process.env.HIGH_RISK_AGE || '65'),
    FREQUENT_VISITS_COUNT: parseInt(process.env.FREQUENT_VISITS_COUNT || '5'),
    HIGH_NO_SHOW_PROBABILITY: parseFloat(process.env.HIGH_NO_SHOW_THRESHOLD || '0.3'),
    RECENT_DAYS: parseInt(process.env.RECENT_DAYS || '90')
  };

  static async predictPatientRisk(patientId: string, tenantId?: string): Promise<PredictionResponse> {
    const where: any = { id: patientId };
    if (tenantId) where.tenant_id = tenantId; // tenant-scope when a context is available
    const patient = await Patient.findOne({
      where,
      include: [
        'appointments',
        { model: Allergy, as: 'allergies', where: { is_active: true }, required: false },
        { model: Medication, as: 'medications', where: { is_active: true }, required: false }
      ]
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Get medical records with ICD-10 codes
    const medicalRecords = await MedicalRecord.findAll({
      where: { patient_id: patientId },
      limit: 10,
      order: [['record_date', 'DESC']]
    });

    // Get most recent vital signs
    const recentVitals = await VitalSign.findOne({
      where: { patient_id: patientId },
      order: [['recorded_at', 'DESC']]
    });

    // Extract ICD-10 codes from records and appointments
    const icd10Codes = new Set<string>();
    medicalRecords.forEach(record => {
      if (record.icd10_codes) {
        record.icd10_codes.forEach(code => icd10Codes.add(code));
      }
    });

    const appointments = patient.appointments || [];
    appointments.forEach(apt => {
      if (apt.icd10_codes) {
        apt.icd10_codes.forEach(code => icd10Codes.add(code));
      }
    });

    // Build comprehensive patient data
    const patientData: PatientRiskData = {
      age: patient.age,
      gender: patient.gender || 'unknown',
      appointmentHistory: appointments.length,
      lastVisit: appointments[0]?.appointment_date,
      allergiesCount: (patient as any).allergies?.length || 0,
      criticalAllergies: (patient as any).allergies?.filter((a: any) => 
        a.severity === 'severe' || a.severity === 'life_threatening'
      ).length || 0,
      activeMedications: (patient as any).medications?.length || 0,
      chronicConditions: this.extractChronicConditions(Array.from(icd10Codes)),
      recentVitals: recentVitals ? {
        bloodPressure: recentVitals.blood_pressure_systolic && recentVitals.blood_pressure_diastolic 
          ? { 
              systolic: recentVitals.blood_pressure_systolic, 
              diastolic: recentVitals.blood_pressure_diastolic 
            }
          : undefined,
        bmi: recentVitals.bmi || recentVitals.calculated_bmi || undefined,
        hasAbnormalReadings: recentVitals.has_abnormal_values
      } : undefined,
      icd10Codes: Array.from(icd10Codes)
    };

    if (this.ML_ENABLED) {
      try {
        const response = await axios.post(`${this.ML_API_URL}/predict/risk`, {
          patientData,
          predictionType: 'risk_assessment'
        }, {
          timeout: 5000 // 5 second timeout
        });

        return response.data as PredictionResponse;
      } catch (error) {
        console.error('ML API error, falling back to rule-based:', error);
        return this.ruleBasedRiskAssessment(patientData);
      }
    }

    return this.ruleBasedRiskAssessment(patientData);
  }

  static async predictNoShowProbability(appointmentId: string): Promise<PredictionResponse> {
    const appointment = await Appointment.findByPk(appointmentId, {
      include: ['patient']
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Count previous no-shows
    const previousNoShows = await Appointment.count({
      where: {
        patient_id: appointment.patient_id,
        status: 'no_show'
      }
    });

    const features: NoShowFeatures = {
      dayOfWeek: new Date(appointment.appointment_date).getDay(),
      timeOfDay: parseInt(appointment.appointment_time.split(':')[0]),
      patientAge: appointment.patient?.age,
      appointmentType: appointment.appointment_type,
      leadTime: Math.floor((new Date(appointment.appointment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      previousNoShows,
      hasReminder: false // TODO: integrate with notification system
    };

    if (this.ML_ENABLED) {
      try {
        const response = await axios.post(`${this.ML_API_URL}/predict/no-show`, {
          features,
          predictionType: 'no_show'
        }, {
          timeout: 5000
        });

        return response.data as PredictionResponse;
      } catch (error) {
        console.error('ML API error, falling back to rule-based:', error);
        return this.ruleBasedNoShowPrediction(features);
      }
    }

    return this.ruleBasedNoShowPrediction(features);
  }

  static async predictResourceDemand(tenantId: string, date: Date): Promise<any> {
    const historicalData = await this.getHistoricalResourceUsage(tenantId, date);

    if (this.ML_ENABLED) {
      try {
        const response = await axios.post(`${this.ML_API_URL}/predict/demand`, {
          historicalData,
          targetDate: date,
          predictionType: 'resource_demand'
        }, {
          timeout: 5000
        });

        return response.data;
      } catch (error) {
        console.error('ML API error, falling back to rule-based:', error);
        return this.ruleBasedDemandPrediction(historicalData);
      }
    }

    return this.ruleBasedDemandPrediction(historicalData);
  }

  static async generateHealthInsights(patientId: string, tenantId?: string): Promise<any[]> {
    const where: any = { id: patientId };
    if (tenantId) where.tenant_id = tenantId; // tenant-scope when a context is available
    const patient = await Patient.findOne({
      where,
      include: ['appointments']
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const insights = [];
    const { HIGH_RISK_AGE, FREQUENT_VISITS_COUNT, RECENT_DAYS } = this.THRESHOLDS;

    // Age-related insights
    if (patient.age > HIGH_RISK_AGE) {
      insights.push({
        type: 'age_risk',
        message: `Patient is in high-risk age group (${patient.age} years)`,
        priority: 'medium',
        recommendations: ['Regular health screenings', 'Preventive care focus', 'Annual wellness visits']
      });
    }

    // Recent appointment frequency
    const recentAppointments = patient.appointments?.filter(apt => 
      new Date(apt.appointment_date) > new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000)
    ) || [];

    if (recentAppointments.length > FREQUENT_VISITS_COUNT) {
      insights.push({
        type: 'frequent_visits',
        message: `Patient has ${recentAppointments.length} appointments in the last ${RECENT_DAYS} days`,
        priority: 'high',
        recommendations: [
          'Care coordination review',
          'Chronic disease management program',
          'Consider care team consultation'
        ]
      });
    }

    // Check for allergies
    const allergies = await Allergy.count({
      where: { patient_id: patientId, is_active: true }
    });

    if (allergies > 0) {
      const criticalAllergies = await Allergy.count({
        where: { 
          patient_id: patientId, 
          is_active: true,
          severity: ['severe', 'life_threatening']
        }
      });

      if (criticalAllergies > 0) {
        insights.push({
          type: 'critical_allergies',
          message: `Patient has ${criticalAllergies} critical allergies on record`,
          priority: 'critical',
          recommendations: [
            'Verify allergy list before any prescription',
            'Alert all care providers',
            'Emergency action plan in place'
          ]
        });
      }
    }

    // Check medication count
    const activeMedications = await Medication.count({
      where: { patient_id: patientId, is_active: true }
    });

    if (activeMedications >= 5) {
      insights.push({
        type: 'polypharmacy',
        message: `Patient is on ${activeMedications} active medications`,
        priority: 'medium',
        recommendations: [
          'Medication reconciliation',
          'Drug interaction screening',
          'Consider simplification of regimen'
        ]
      });
    }

    // Check vital signs
    const recentVitals = await VitalSign.findOne({
      where: { patient_id: patientId },
      order: [['recorded_at', 'DESC']]
    });

    if (recentVitals && recentVitals.has_abnormal_values) {
      insights.push({
        type: 'abnormal_vitals',
        message: 'Recent vital signs show abnormal readings',
        priority: 'high',
        recommendations: [
          'Follow-up vital signs monitoring',
          'Review abnormal values: ' + recentVitals.getAbnormalValues().join(', '),
          'Consider additional assessment'
        ]
      });
    }

    return insights;
  }

  private static extractChronicConditions(icd10Codes: string[]): string[] {
    // Common chronic condition ICD-10 code prefixes
    const chronicPrefixes: Record<string, string> = {
      'E11': 'Type 2 Diabetes',
      'E10': 'Type 1 Diabetes',
      'I10': 'Hypertension',
      'I50': 'Heart Failure',
      'J44': 'COPD',
      'J45': 'Asthma',
      'N18': 'Chronic Kidney Disease',
      'E78': 'Hyperlipidemia'
    };

    const conditions = new Set<string>();
    icd10Codes.forEach(code => {
      const prefix = code.substring(0, 3);
      if (chronicPrefixes[prefix]) {
        conditions.add(chronicPrefixes[prefix]);
      }
    });

    return Array.from(conditions);
  }

  private static ruleBasedRiskAssessment(patientData: PatientRiskData): PredictionResponse {
    let risk = 0.2; // Base risk
    const factors: string[] = [];

    // Age factor
    if (patientData.age > this.THRESHOLDS.HIGH_RISK_AGE) {
      risk += 0.2;
      factors.push(`Advanced age (${patientData.age} years)`);
    }

    // Chronic conditions
    if (patientData.chronicConditions.length > 0) {
      risk += 0.15 * patientData.chronicConditions.length;
      factors.push(`Chronic conditions: ${patientData.chronicConditions.join(', ')}`);
    }

    // Critical allergies
    if (patientData.criticalAllergies > 0) {
      risk += 0.1;
      factors.push(`${patientData.criticalAllergies} critical allergies`);
    }

    // Polypharmacy
    if (patientData.activeMedications >= 5) {
      risk += 0.1;
      factors.push(`Polypharmacy (${patientData.activeMedications} medications)`);
    }

    // Abnormal vitals
    if (patientData.recentVitals?.hasAbnormalReadings) {
      risk += 0.15;
      factors.push('Abnormal vital signs');
    }

    // Frequent visits
    if (patientData.appointmentHistory > 10) {
      risk += 0.1;
      factors.push('Frequent medical visits');
    }

    const finalRisk = Math.min(risk, 1.0);
    const recommendations: string[] = [];

    if (finalRisk > 0.7) {
      recommendations.push('Enhanced monitoring required');
      recommendations.push('Consider care coordination');
      recommendations.push('Comprehensive care plan review');
    } else if (finalRisk > 0.5) {
      recommendations.push('Regular monitoring');
      recommendations.push('Preventive care focus');
    } else {
      recommendations.push('Standard care protocol');
      recommendations.push('Annual wellness visits');
    }

    return {
      prediction: finalRisk,
      confidence: 0.70,
      factors,
      recommendations
    };
  }

  private static ruleBasedNoShowPrediction(features: NoShowFeatures): PredictionResponse {
    let probability = 0.12; // Base no-show rate
    const factors: string[] = [];

    // Day of week factor
    if (features.dayOfWeek === 1) {
      probability += 0.08;
      factors.push('Monday appointment');
    }

    // Time of day
    if (features.timeOfDay < 9) {
      probability += 0.05;
      factors.push('Early morning slot');
    }
    if (features.timeOfDay > 16) {
      probability += 0.03;
      factors.push('Late afternoon slot');
    }

    // Lead time
    if (features.leadTime > 30) {
      probability += 0.12;
      factors.push('Scheduled far in advance');
    } else if (features.leadTime < 2) {
      probability -= 0.05;
      factors.push('Same-day or next-day appointment');
    }

    // Previous no-shows
    if (features.previousNoShows > 0) {
      probability += 0.15 * features.previousNoShows;
      factors.push(`${features.previousNoShows} previous no-shows`);
    }

    // Appointment type
    if (features.appointmentType === 'follow_up') {
      probability -= 0.05;
      factors.push('Follow-up appointment (higher commitment)');
    }

    const finalProbability = Math.min(probability, 1.0);
    const recommendations: string[] = [];

    if (finalProbability > this.THRESHOLDS.HIGH_NO_SHOW_PROBABILITY) {
      recommendations.push('Send confirmation SMS 24-48 hours before');
      recommendations.push('Follow up with phone call');
      recommendations.push('Consider overbooking strategy');
    } else {
      recommendations.push('Standard reminder notification');
      recommendations.push('Confirm via patient portal');
    }

    return {
      prediction: finalProbability,
      confidence: 0.72,
      factors,
      recommendations
    };
  }

  private static ruleBasedDemandPrediction(historicalData: ResourceUsageData[]): any {
    if (historicalData.length === 0) {
      return {
        predictedAppointments: 0,
        predictedStaffNeeded: 0,
        confidence: 0.0,
        recommendations: ['Insufficient historical data']
      };
    }

    const avgDemand = historicalData.reduce((sum, day) => sum + day.appointments, 0) / historicalData.length;
    const maxDemand = Math.max(...historicalData.map(day => day.appointments));
    
    // Add 10% buffer for safety
    const predictedAppointments = Math.round(avgDemand * 1.1);
    
    // Assume 8 appointments per doctor per day
    const predictedStaffNeeded = Math.ceil(predictedAppointments / 8);
    
    const recommendations: string[] = [];
    if (predictedAppointments > avgDemand * 1.2) {
      recommendations.push('Higher than average demand expected');
      recommendations.push('Consider additional staff scheduling');
    } else {
      recommendations.push('Standard staffing levels appropriate');
    }

    return {
      predictedAppointments,
      predictedStaffNeeded,
      maxHistoricalDemand: maxDemand,
      averageHistoricalDemand: Math.round(avgDemand),
      confidence: 0.65,
      recommendations
    };
  }

  private static async getHistoricalResourceUsage(tenantId: string, targetDate: Date): Promise<ResourceUsageData[]> {
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
        AND status NOT IN ('cancelled', 'no_show')
      GROUP BY appointment_date
      ORDER BY appointment_date
    `;

    return sequelize.query(query, {
      replacements: { tenantId, start: thirtyDaysAgo, end: targetDate, dayOfWeek },
      type: QueryTypes.SELECT
    }) as Promise<ResourceUsageData[]>;
  }
}