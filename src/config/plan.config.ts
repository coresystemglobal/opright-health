/**
 * Subscription Plan Configuration
 * 
 * This module provides configurable pricing for subscription plans.
 * Prices can be set via environment variables or fall back to defaults.
 */

import { PlanType } from '@modules/billing/subscription.model';

interface PlanPricing {
  monthly: number;
  yearly: number;
}

interface PlanLimits {
  maxPatients: number;
  maxUsers: number;
  maxStorageMB: number;
  maxAPICallsPerMonth: number;
  features: string[];
}

/**
 * Get pricing from environment variables or use defaults
 */
const getPlanPricing = (): Record<PlanType, PlanPricing> => {
  return {
    [PlanType.INDIVIDUAL]: {
      monthly: parseFloat(process.env.INDIVIDUAL_PLAN_MONTHLY_PRICE || '49'),
      yearly: parseFloat(process.env.INDIVIDUAL_PLAN_YEARLY_PRICE || '490')
    },
    [PlanType.BASIC]: {
      monthly: parseFloat(process.env.BASIC_PLAN_MONTHLY_PRICE || '99'),
      yearly: parseFloat(process.env.BASIC_PLAN_YEARLY_PRICE || '990')
    },
    [PlanType.STANDARD]: {
      monthly: parseFloat(process.env.STANDARD_PLAN_MONTHLY_PRICE || '299'),
      yearly: parseFloat(process.env.STANDARD_PLAN_YEARLY_PRICE || '2990')
    },
    [PlanType.PRO]: {
      monthly: parseFloat(process.env.PRO_PLAN_MONTHLY_PRICE || '599'),
      yearly: parseFloat(process.env.PRO_PLAN_YEARLY_PRICE || '5990')
    }
  };
};

/**
 * Get plan limits from environment variables or use defaults
 */
const getPlanLimits = (): Record<PlanType, PlanLimits> => {
  return {
    [PlanType.INDIVIDUAL]: {
      maxPatients: parseInt(process.env.INDIVIDUAL_PLAN_MAX_PATIENTS || '50'),
      maxUsers: parseInt(process.env.INDIVIDUAL_PLAN_MAX_USERS || '1'),
      maxStorageMB: parseInt(process.env.INDIVIDUAL_PLAN_MAX_STORAGE_MB || '512'),
      maxAPICallsPerMonth: parseInt(process.env.INDIVIDUAL_PLAN_MAX_API_CALLS || '5000'),
      features: ['emr', 'scheduler', 'visit_management', 'patient_management', 'invoice_generation', 'lab_management', 'icd10_integration']
    },
    [PlanType.BASIC]: {
      maxPatients: parseInt(process.env.BASIC_PLAN_MAX_PATIENTS || '100'),
      maxUsers: parseInt(process.env.BASIC_PLAN_MAX_USERS || '5'),
      maxStorageMB: parseInt(process.env.BASIC_PLAN_MAX_STORAGE_MB || '1024'),
      maxAPICallsPerMonth: parseInt(process.env.BASIC_PLAN_MAX_API_CALLS || '10000'),
      features: ['basic_reporting', 'patient_management', 'appointments']
    },
    [PlanType.STANDARD]: {
      maxPatients: parseInt(process.env.STANDARD_PLAN_MAX_PATIENTS || '500'),
      maxUsers: parseInt(process.env.STANDARD_PLAN_MAX_USERS || '20'),
      maxStorageMB: parseInt(process.env.STANDARD_PLAN_MAX_STORAGE_MB || '5120'),
      maxAPICallsPerMonth: parseInt(process.env.STANDARD_PLAN_MAX_API_CALLS || '50000'),
      features: ['basic_reporting', 'advanced_reporting', 'patient_management', 'appointments', 'lab_integration', 'mobile_api']
    },
    [PlanType.PRO]: {
      maxPatients: parseInt(process.env.PRO_PLAN_MAX_PATIENTS || '-1'),
      maxUsers: parseInt(process.env.PRO_PLAN_MAX_USERS || '-1'),
      maxStorageMB: parseInt(process.env.PRO_PLAN_MAX_STORAGE_MB || '20480'),
      maxAPICallsPerMonth: parseInt(process.env.PRO_PLAN_MAX_API_CALLS || '200000'),
      features: ['all_features', 'fhir_compliance', 'insurance_verification', 'advanced_analytics', 'ml_predictions', 'iot_integration', 'workflow_automation', 'telemedicine', 'priority_support']
    }
  };
};

export const PlanConfig = {
  pricing: getPlanPricing(),
  limits: getPlanLimits()
};

export type { PlanPricing, PlanLimits };
