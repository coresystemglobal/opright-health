import { collectRoutes, type DeclaredRoute } from './registry';
import { POLICY } from './policy';
import { lookupPolicy, compilePolicy } from './gate';
import { PUBLIC } from './types';

/**
 * ============================================================================
 *  RECONCILER - proves every declared route has a policy, at boot and in CI.
 * ============================================================================
 *
 *  The gate already fails closed at runtime, so an undeclared route is denied
 *  rather than exposed. The reconciler turns that quiet denial into a loud,
 *  early failure: the build breaks instead of a feature silently 403-ing in
 *  production.
 */

export interface ReconcileReport {
  /** Routes the app serves that no policy entry covers. Must be empty. */
  unprotected: DeclaredRoute[];
  /** Policy entries that match no declared route. Dead config - safe, but tidy. */
  orphaned: string[];
  /** Entries whose permission was derived during migration, not reviewed. */
  unreviewed: string[];
  totalRoutes: number;
  totalPolicies: number;
}

export function reconcile(router: unknown): ReconcileReport {
  compilePolicy(); // surfaces malformed policy paths before anything else

  const declared = collectRoutes(router);

  const unprotected = declared.filter((r) => !lookupPolicy(r.method, r.path));

  const matched = new Set<string>();
  for (const r of declared) {
    const entry = lookupPolicy(r.method, r.path);
    if (entry) matched.add(`${entry.m} ${entry.p}`);
  }

  const orphaned = POLICY.map((e) => `${e.m} ${e.p}`).filter((k) => !matched.has(k));

  const unreviewed = POLICY.filter((e) => e.review).map((e) => `${e.m} ${e.p}`);

  return {
    unprotected,
    orphaned,
    unreviewed,
    totalRoutes: declared.length,
    totalPolicies: POLICY.length,
  };
}

/**
 * Boot guard. Call after the router tree is built and before listen().
 *
 * Throws on any unprotected route. `strict` additionally fails on entries still
 * carrying `review: true`, so CI can hold the line once the migration is done.
 */
export function assertPolicyComplete(
  router: unknown,
  opts: { strict?: boolean; log?: boolean } = {}
): ReconcileReport {
  const report = reconcile(router);

  if (opts.log !== false) {
    console.log(
      `[policy] ${report.totalRoutes} routes, ${report.totalPolicies} policy entries, ` +
        `${report.orphaned.length} orphaned, ${report.unreviewed.length} awaiting review`
    );
  }

  if (report.unprotected.length > 0) {
    const list = report.unprotected.map((r) => `  ${r.method} ${r.path}`).join('\n');
    throw new Error(
      `FATAL: ${report.unprotected.length} route(s) have no access policy.\n` +
        `${list}\n\n` +
        `Add an entry to src/security/policy.ts for each. Until then these routes ` +
        `are denied at runtime (403 NO_POLICY).`
    );
  }

  if (opts.strict && report.unreviewed.length > 0) {
    throw new Error(
      `FATAL: ${report.unreviewed.length} policy entries still carry review: true.\n` +
        report.unreviewed.map((k) => `  ${k}`).join('\n')
    );
  }

  // Not fatal: a stale entry denies nothing, it just misleads a reader.
  if (report.orphaned.length > 0 && opts.log !== false) {
    console.warn(
      `[policy] ${report.orphaned.length} policy entries match no route (stale?):\n` +
        report.orphaned
          .slice(0, 10)
          .map((k) => `  ${k}`)
          .join('\n') +
        (report.orphaned.length > 10 ? `\n  ...and ${report.orphaned.length - 10} more` : '')
    );
  }

  return report;
}

/** Count of routes reachable without authentication - handy for release notes. */
export function publicSurface(): string[] {
  return POLICY.filter((e) => e.perm === PUBLIC).map((e) => `${e.m} ${e.p}`);
}
