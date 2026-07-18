import { Tenant } from '@modules/tenancy/tenant.model';

/**
 * Direct-to-consumer (DTC) platform tenant.
 *
 * Self-service users who don't belong to any hospital are anchored to this
 * single, system-owned tenant. It owns their Patient records and lets them use
 * tenant-scoped features (telemedicine, triage, record sharing) without first
 * being registered by a hospital. Its ID is fixed so it can be referenced
 * without a lookup; override via PLATFORM_TENANT_ID if a deployment seeds a
 * different one.
 */
export const PLATFORM_TENANT_ID =
  process.env.PLATFORM_TENANT_ID || '00000000-0000-4000-8000-000000000001';

export const PLATFORM_TENANT_SUBDOMAIN = 'platform';

let cached: Tenant | null = null;

/** Load the platform tenant (cached). Returns null if it hasn't been seeded. */
export async function getPlatformTenant(): Promise<Tenant | null> {
  if (cached) return cached;
  cached = await Tenant.findByPk(PLATFORM_TENANT_ID);
  if (!cached) {
    cached = await Tenant.findOne({ where: { subdomain: PLATFORM_TENANT_SUBDOMAIN } });
  }
  return cached;
}
