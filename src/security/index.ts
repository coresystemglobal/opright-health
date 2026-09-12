/**
 * Access-control layer.
 *
 * Mount order in core/index.ts:
 *
 *   import { installRegistry } from './security';   // FIRST - before routers
 *   installRegistry();
 *   ...
 *   server.use('/api/v1', accessControl, router);
 *   assertPolicyComplete(router);                   // before listen()
 */
export { PUBLIC, SELF } from './types';
export type { PolicyEntry, TenantScope, Decision } from './types';
export { POLICY } from './policy';
export { accessControl, decide, lookupPolicy, compilePolicy } from './gate';
export { loadPrincipal, loadPermissions, invalidatePrincipal } from './permissions';
export { installRegistry, collectRoutes } from './registry';
export type { DeclaredRoute } from './registry';
export { reconcile, assertPolicyComplete, publicSurface } from './reconcile';
export type { ReconcileReport } from './reconcile';
