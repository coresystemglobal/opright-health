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
// Flat all-inclusive model (recorded decision): every tier gets EVERY feature.
// Tiers differ only by capacity (patients / users / storage / API volume).
// `all_features` is the wildcard requireFeature() honours, so no tenant is
// ever denied a feature on plan grounds — only on capacity limits.
const ALL_FEATURES = ['all_features'];

const getPlanLimits = (): Record<PlanType, PlanLimits> => {
  return {
    [PlanType.INDIVIDUAL]: {
      maxPatients: parseInt(process.env.INDIVIDUAL_PLAN_MAX_PATIENTS || '50'),
      maxUsers: parseInt(process.env.INDIVIDUAL_PLAN_MAX_USERS || '1'),
      maxStorageMB: parseInt(process.env.INDIVIDUAL_PLAN_MAX_STORAGE_MB || '512'),
      maxAPICallsPerMonth: parseInt(process.env.INDIVIDUAL_PLAN_MAX_API_CALLS || '5000'),
      features: ALL_FEATURES
    },
    [PlanType.BASIC]: {
      maxPatients: parseInt(process.env.BASIC_PLAN_MAX_PATIENTS || '100'),
      maxUsers: parseInt(process.env.BASIC_PLAN_MAX_USERS || '5'),
      maxStorageMB: parseInt(process.env.BASIC_PLAN_MAX_STORAGE_MB || '1024'),
      maxAPICallsPerMonth: parseInt(process.env.BASIC_PLAN_MAX_API_CALLS || '10000'),
      features: ALL_FEATURES
    },
    [PlanType.STANDARD]: {
      maxPatients: parseInt(process.env.STANDARD_PLAN_MAX_PATIENTS || '500'),
      maxUsers: parseInt(process.env.STANDARD_PLAN_MAX_USERS || '20'),
      maxStorageMB: parseInt(process.env.STANDARD_PLAN_MAX_STORAGE_MB || '5120'),
      maxAPICallsPerMonth: parseInt(process.env.STANDARD_PLAN_MAX_API_CALLS || '50000'),
      features: ALL_FEATURES
    },
    [PlanType.PRO]: {
      maxPatients: parseInt(process.env.PRO_PLAN_MAX_PATIENTS || '-1'),
      maxUsers: parseInt(process.env.PRO_PLAN_MAX_USERS || '-1'),
      maxStorageMB: parseInt(process.env.PRO_PLAN_MAX_STORAGE_MB || '20480'),
      maxAPICallsPerMonth: parseInt(process.env.PRO_PLAN_MAX_API_CALLS || '200000'),
      features: ALL_FEATURES
    }
  };
};

export const PlanConfig = {
  pricing: getPlanPricing(),
  limits: getPlanLimits()
};

export type { PlanPricing, PlanLimits };
