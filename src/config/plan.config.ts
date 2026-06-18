import { PlanType } from '@modules/billing/subscription.model';

/**
 * Capacity-based flat plans: every tenant gets every feature.
 * Tiers differ only by capacity (patients, storage, API volume).
 * -1 means unlimited.
 */
export interface PlanLimits {
  maxPatients: number;
  maxUsers: number;
  maxStorageMB: number;
  maxAPICallsPerMonth: number;
  // Flat plans: every tier carries 'all_features' (capacity-only tiering)
  features: string[];
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
}

export const PlanConfig: {
  limits: Record<PlanType, PlanLimits>;
  pricing: Record<PlanType, PlanPricing>;
} = {
  limits: {
    [PlanType.BASIC]: {
      maxPatients: 500,
      maxUsers: 5,
      maxStorageMB: 10 * 1024,
      maxAPICallsPerMonth: 50_000,
      features: ['all_features']
    },
    [PlanType.STANDARD]: {
      maxPatients: 5_000,
      maxUsers: 50,
      maxStorageMB: 100 * 1024,
      maxAPICallsPerMonth: 500_000,
      features: ['all_features']
    },
    [PlanType.PRO]: {
      maxPatients: -1,
      maxUsers: -1,
      maxStorageMB: -1,
      maxAPICallsPerMonth: -1,
      features: ['all_features']
    }
  },
  // Amounts in NGN. Yearly = 10x monthly (2 months free).
  pricing: {
    [PlanType.BASIC]: { monthly: 25_000, yearly: 250_000 },
    [PlanType.STANDARD]: { monthly: 100_000, yearly: 1_000_000 },
    [PlanType.PRO]: { monthly: 400_000, yearly: 4_000_000 }
  }
};
