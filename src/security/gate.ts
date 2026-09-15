import { match, type MatchFunction } from 'path-to-regexp';
import { Request, Response, NextFunction } from 'express';

import { POLICY } from './policy';
import { PUBLIC, SELF, type Decision, type PolicyEntry } from './types';
import { loadPrincipal } from './permissions';
import { verifyAuthHeader } from './token';

/**
 * ============================================================================
 *  THE GATE - deny-by-default access control, mounted once above the router.
 * ============================================================================
 *
 *  A request that matches no POLICY entry is refused. This is the whole point:
 *  a new route is inert until someone adds a policy for it, so forgetting the
 *  security step produces a broken feature in development rather than an open
 *  door in production.
 *
 *  Set POLICY_MODE=report to log decisions without enforcing them - use this
 *  to migrate safely, then switch to POLICY_MODE=enforce (the default).
 */

type Compiled = PolicyEntry & { test: MatchFunction<object> };

let compiled: Compiled[] | null = null;

/** Compile the table once. Invalid paths fail here, at boot, not per request. */
export function compilePolicy(): Compiled[] {
  if (compiled) return compiled;
  compiled = POLICY.map((e) => {
    try {
      return { ...e, test: match(e.p, { decode: decodeURIComponent }) };
    } catch (err) {
      throw new Error(
        `Invalid policy path ${e.m} ${e.p}: ${(err as Error).message}`
      );
    }
  });
  return compiled;
}

/** First match wins, exactly like Express. Order in policy.ts is significant. */
export function lookupPolicy(method: string, path: string): PolicyEntry | null {
  const m = method.toUpperCase();
  for (const e of compilePolicy()) {
    if (e.m !== 'ALL' && e.m !== m) continue;
    if (e.test(path)) return e;
  }
  return null;
}

interface AccessUser {
  userId: string;
  email?: string;
  tenantId?: string;
  permissions: string[];
}

/** Evaluate the policy for a request. Pure - no I/O, so it is directly testable. */
export function decide(
  method: string,
  path: string,
  user: AccessUser | null,
  tenantId: string | null
): Decision {
  const entry = lookupPolicy(method, path);

  // ── deny by default ──────────────────────────────────────────────────────
  if (!entry) {
    return {
      allow: false,
      status: 403,
      code: 'NO_POLICY',
      detail: `no policy entry for ${method.toUpperCase()} ${path}`,
    };
  }

  if (entry.perm === PUBLIC) return { allow: true, entry };

  if (!user) {
    return { allow: false, status: 401, code: 'UNAUTHENTICATED' };
  }

  // ── tenant membership (audit finding C-2) ────────────────────────────────
  if (entry.tenant === 'required') {
    if (!tenantId) {
      return { allow: false, status: 400, code: 'TENANT_REQUIRED' };
    }
    if (user.tenantId !== tenantId) {
      // 404, not 403: do not confirm that another tenant's record exists.
      return { allow: false, status: 404, code: 'NOT_FOUND', detail: 'cross-tenant access' };
    }
  }

  if (entry.perm === SELF) return { allow: true, entry };

  if (!user.permissions.includes(entry.perm as string)) {
    return {
      allow: false,
      status: 403,
      code: 'FORBIDDEN',
      detail: `requires ${String(entry.perm)}`,
    };
  }

  return { allow: true, entry };
}

const REPORT_ONLY = () => (process.env.POLICY_MODE || 'enforce').toLowerCase() === 'report';

/**
 * The middleware. Mount once, above the router:
 *
 *   server.use('/api/v1', accessControl, router);
 */
export const accessControl = async (req: Request, res: Response, next: NextFunction) => {
  const entry = lookupPolicy(req.method, req.path);

  let user: AccessUser | null = null;

  // Only authenticate when the route needs it - PUBLIC routes must stay
  // reachable without a token.
  if (entry && entry.perm !== PUBLIC) {
    const verified = verifyAuthHeader(req.headers.authorization);
    if (verified.ok) {
      const { payload } = verified;
      try {
        // The database is authoritative for tenant membership; a token claim is
        // only a fallback, since a token minted before a tenant move is stale.
        const principal = await loadPrincipal(payload.userId);
        user = {
          userId: payload.userId,
          email: payload.email,
          tenantId: principal.tenantId ?? payload.tenant_id ?? payload.tenantId,
          permissions: principal.permissions,
        };
      } catch (err) {
        // Permission store unavailable: fail closed rather than allow through.
        return res.status(503).json({
          success: false,
          message: 'Authorisation service unavailable',
          error: 'AUTHZ_UNAVAILABLE',
        });
      }
    }
  }

  const tenantId =
    (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || null;

  const decision = decide(req.method, req.path, user, tenantId);

  if (decision.allow) {
    // Downstream handlers read these instead of trusting raw headers.
    (req as any).user = user
      ? { userId: user.userId, email: user.email, tenant_id: user.tenantId }
      : undefined;
    (req as any).policy = decision.entry;
    (req as any).tenantId =
      decision.entry.tenant === 'none' ? undefined : tenantId ?? undefined;
    return next();
  }

  if (REPORT_ONLY()) {
    console.warn(
      `[POLICY:report] would deny ${decision.status} ${decision.code} ` +
        `${req.method} ${req.path}${decision.detail ? ` - ${decision.detail}` : ''}`
    );
    return next();
  }

  if (decision.code === 'NO_POLICY') {
    // Loud: this is a route nobody declared. It should be impossible in a build
    // that passed verify:policy, so treat it as a defect, not routine traffic.
    console.error(`[POLICY:denied] ${decision.detail}`);
  }

  return res.status(decision.status).json({
    success: false,
    message:
      decision.status === 404
        ? 'Not found'
        : decision.status === 401
          ? 'Authentication required'
          : 'Access denied',
    error: decision.code,
  });
};
