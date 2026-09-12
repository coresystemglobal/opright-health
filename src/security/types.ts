/**
 * Shared types for the access-policy layer.
 *
 * PUBLIC and SELF are symbols rather than strings so that a typo in a policy
 * entry ("public") is a compile error instead of a silently-denied route.
 */

/** No authentication required. Every use is a deliberate security decision. */
export const PUBLIC = Symbol('policy.public');

/**
 * Authenticated, but no resource permission applies: the handler resolves the
 * caller's OWN record from req.user.userId and can only ever return their data
 * (e.g. the patient portal). Never use this for a route that accepts an id.
 */
export const SELF = Symbol('policy.self');

export type TenantScope = 'required' | 'optional' | 'none';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL';

export interface PolicyEntry {
  /** HTTP method. */
  m: HttpMethod;
  /** Path as mounted under /api/v1 (see router.ts). */
  p: string;
  /** 'resource:action', or PUBLIC / SELF. */
  perm: string | typeof PUBLIC | typeof SELF;
  /** How the tenant is resolved and enforced for this route. */
  tenant: TenantScope;
  /**
   * Set during migration when the permission was derived from the route shape
   * rather than transcribed from an existing checkPermission call. Confirm and
   * remove. `npm run verify:policy -- --strict` fails while any remain.
   */
  review?: boolean;
}

/** Result of evaluating the policy for one request. */
export type Decision =
  | { allow: true; entry: PolicyEntry }
  | { allow: false; status: number; code: string; detail?: string };
