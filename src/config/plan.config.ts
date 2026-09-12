/**
 * Subscription Plan Configuration
 * 
 * This module provides configurable pricing for subscription plans.
 * Prices are managed in the plans table; these values are emergency fallbacks.
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
 * Use fallback pricing when the plans table is unavailable.
 */
const getPlanPricing = (): Record<PlanType, PlanPricing> => {
  return {
    [PlanType.INDIVIDUAL]: {
      monthly: 49,
      yearly: 490
    },
    [PlanType.BASIC]: {
      monthly: 99,
      yearly: 990
    },
    [PlanType.STANDARD]: {
      monthly: 299,
      yearly: 2990
    },
    [PlanType.PRO]: {
      monthly: 599,
      yearly: 5990
    }
  };
};

/**
 * Get plan limits from environment variables or use defaults
 */
// FALLBACK ONLY. Real per-tier feature entitlements now live in the `plans`
// DB table (see migration 20241201000069) and are loaded by
// BillingService.refreshPlansCache(). This config is the seed/fallback used
// only when the plans table is empty or unavailable; `all_features` is the
// wildcard requireFeature() honours (fail-open when no plans are seeded).
const ALL_FEATURES = ['all_features'];

const getPlanLimits = (): Record<PlanType, PlanLimits> => {
  return {
    [PlanType.INDIVIDUAL]: {
      maxPatients: 50,
      maxUsers: 1,
      maxStorageMB: 512,
      maxAPICallsPerMonth: 5000,
      features: ALL_FEATURES
    },
    [PlanType.BASIC]: {
      maxPatients: 100,
      maxUsers: 5,
      maxStorageMB: 1024,
      maxAPICallsPerMonth: 10000,
      features: ALL_FEATURES
    },
    [PlanType.STANDARD]: {
      maxPatients: 500,
      maxUsers: 20,
      maxStorageMB: 5120,
      maxAPICallsPerMonth: 50000,
      features: ALL_FEATURES
    },
    [PlanType.PRO]: {
      maxPatients: -1,
      maxUsers: -1,
      maxStorageMB: 20480,
      maxAPICallsPerMonth: 200000,
      features: ALL_FEATURES
    }
  };
};

export const PlanConfig = {
  pricing: getPlanPricing(),
  limits: getPlanLimits()
};

export type { PlanPricing, PlanLimits };
