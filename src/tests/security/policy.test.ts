import { POLICY } from '../../security/policy';
import { decide, lookupPolicy, compilePolicy } from '../../security/gate';
import { PUBLIC, SELF } from '../../security/types';

/**
 * These tests hold the deny-by-default invariant in place. If someone adds a
 * route without a policy, or widens the public surface, this suite fails.
 */

const nurse = {
  userId: 'u1',
  tenantId: 'T1',
  permissions: ['patient:view', 'appointment:view'],
};

describe('access policy', () => {
  it('compiles every entry (catches malformed paths)', () => {
    expect(() => compilePolicy()).not.toThrow();
    expect(POLICY.length).toBeGreaterThan(0);
  });

  it('denies any route with no policy entry', () => {
    const d = decide('GET', '/api/does-not-exist', nurse, 'T1');
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.code).toBe('NO_POLICY');
  });

  it('requires authentication on non-public routes', () => {
    const d = decide('GET', '/api/patients', null, 'T1');
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.status).toBe(401);
  });

  it('allows public routes without a token', () => {
    expect(decide('POST', '/auth/login', null, null).allow).toBe(true);
  });

  it('refuses cross-tenant access with 404, not 403', () => {
    const d = decide('GET', '/api/patients/abc', nurse, 'T2');
    expect(d.allow).toBe(false);
    // 403 would confirm the record exists in another tenant.
    if (!d.allow) expect(d.status).toBe(404);
  });

  it('allows same-tenant access with the right permission', () => {
    expect(decide('GET', '/api/patients/abc', nurse, 'T1').allow).toBe(true);
  });

  it('denies when the permission is missing', () => {
    const d = decide('POST', '/api/patients', nurse, 'T1');
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.code).toBe('FORBIDDEN');
  });

  it('prefers literal segments over :param (ordering is significant)', () => {
    const entry = lookupPolicy('GET', '/api/patients/me');
    expect(entry?.p).toBe('/api/patients/me');
    expect(entry?.perm).toBe(SELF);
  });

  describe('regressions from the security audit', () => {
    it('C-1: appointments are not anonymously readable', () => {
      expect(decide('GET', '/api/appointments', null, 'T1').allow).toBe(false);
      expect(decide('DELETE', '/api/appointments/a1', null, 'T1').allow).toBe(false);
    });

    it('C-1: the analytics dashboard is not anonymous', () => {
      expect(decide('GET', '/api/dashboard/analytics', null, 'T1').allow).toBe(false);
    });

    it('C-3: RBAC mutation needs an explicit permission', () => {
      const d = decide('POST', '/api/roles/assign', nurse, 'T1');
      expect(d.allow).toBe(false);
      if (!d.allow) expect(d.code).toBe('FORBIDDEN');
    });

    it('C-5: refunds need an explicit permission', () => {
      const d = decide('POST', '/api/payments/refund/p1', nurse, 'T1');
      expect(d.allow).toBe(false);
    });
  });

  describe('public surface', () => {
    const publicRoutes = POLICY.filter((e) => e.perm === PUBLIC).map((e) => `${e.m} ${e.p}`);

    // Update this list ONLY with a deliberate decision to expose a new route.
    const EXPECTED = [
      'GET /api-docs',
      'GET /api/payments/paystack/callback',
      'POST /api/payments/webhook/flutterwave',
      'POST /api/payments/webhook/paystack',
      'POST /api/payments/webhook/stripe',
      'POST /api/visitors/check-in',
      'GET /health',
      'GET /live',
      'GET /ready',
      'POST /auth/2fa/verify',
      'POST /auth/forgot-password',
      'POST /auth/login',
      'POST /auth/refresh-token',
      'POST /auth/register',
      'POST /auth/reset-password',
      'POST /auth/verify-email',
    ];

    it('exposes exactly the reviewed set of unauthenticated routes', () => {
      expect(publicRoutes.sort()).toEqual(EXPECTED.sort());
    });
  });

  describe('tenant scoping', () => {
    it('every /api route is tenant-scoped unless deliberately exempt', () => {
      const exempt = POLICY.filter(
        (e) => e.p.startsWith('/api/') && e.tenant === 'none' && e.perm !== PUBLIC
      ).map((e) => `${e.m} ${e.p}`);
      expect(exempt).toEqual([]);
    });
  });
});
