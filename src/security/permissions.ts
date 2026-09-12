import { User } from '../models';
import { Role } from '@modules/rbac/role.model';
import { Permission } from '@modules/rbac/permission.model';
import { initializeRedisConnection } from '../core/redis';

/**
 * Resolves a caller's permissions and tenant from the database.
 *
 * This is the ONE source of truth for authorisation, replacing the split
 * between the static ROLE_PERMISSIONS map (permission.middleware.ts) and the
 * DB-backed lookup (authorization.ts) - audit finding CC-1. Permissions are
 * normalised to 'resource:action', matching the string form the old static map
 * used, so existing permission names carry over unchanged.
 */

const CACHE_TTL_SECONDS = 300;

export interface Principal {
  permissions: string[];
  tenantId?: string;
}

const cacheKey = (userId: string) => `rbac:v2:${userId}`;

async function readCache(userId: string): Promise<Principal | null> {
  try {
    const redis = await initializeRedisConnection();
    const raw = await redis.get(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Principal) : null;
  } catch {
    return null; // Redis down - fall through to the database.
  }
}

async function writeCache(userId: string, principal: Principal): Promise<void> {
  try {
    const redis = await initializeRedisConnection();
    await redis.set(cacheKey(userId), JSON.stringify(principal), 'EX', CACHE_TTL_SECONDS);
  } catch {
    // Caching is an optimisation; never fail the request over it.
  }
}

/**
 * Drop a user's cached permissions. MUST be called whenever a role is assigned,
 * a role's permissions change, or a user is deactivated - otherwise a
 * revocation takes up to CACHE_TTL_SECONDS to take effect.
 */
export async function invalidatePrincipal(userId: string): Promise<void> {
  try {
    const redis = await initializeRedisConnection();
    await redis.del(cacheKey(userId));
  } catch {
    // Best effort: the entry expires on its own within the TTL.
  }
}

/**
 * Drop the cached permissions of every user holding a role, after that role's
 * permission set changes. Without this, a revoked permission stays usable for
 * up to CACHE_TTL_SECONDS across every member of the role.
 */
export async function invalidateRoleMembers(roleId: string): Promise<void> {
  try {
    const members = await User.findAll({
      where: { role_id: roleId },
      attributes: ['id'],
    });
    await Promise.all(members.map((u: User) => invalidatePrincipal((u as any).id)));
  } catch (err) {
    // Log loudly: a missed invalidation is a window of stale authorisation.
    console.error(`[rbac] failed to invalidate cache for role ${roleId}:`, err);
  }
}

/**
 * Throws if the datastore is unreachable, so the gate can fail closed rather
 * than treat "no permissions found" as "no permissions granted".
 */
export async function loadPrincipal(userId: string): Promise<Principal> {
  const cached = await readCache(userId);
  if (cached) return cached;

  const user = await User.findByPk(userId, {
    attributes: ['id', 'tenant_id', 'is_active'],
    include: [
      {
        model: Role,
        as: 'role',
        include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
      },
    ],
  });

  // A deleted or deactivated account resolves to no permissions rather than an
  // error, so it is denied by the normal permission check.
  if (!user || (user as any).is_active === false) {
    return { permissions: [] };
  }

  const role = (user as any).role;
  const permissions: string[] = ((role?.permissions ?? []) as Permission[]).map(
    (p) => `${p.resource}:${p.action}`
  );

  const principal: Principal = {
    permissions,
    tenantId: (user as any).tenant_id ?? undefined,
  };

  await writeCache(userId, principal);
  return principal;
}

/** Back-compat helper for callers that only need the permission strings. */
export async function loadPermissions(userId: string): Promise<string[]> {
  return (await loadPrincipal(userId)).permissions;
}
