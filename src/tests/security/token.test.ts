import jwt from 'jsonwebtoken';
import { verifyAccessToken, verifyAuthHeader, bearerFrom } from '../../security/token';
import { timingSafeEqualStr } from '../../utils/secure-compare.util';

const SECRET = 'test-secret-at-least-16-chars';

describe('access token verification (audit finding C-4)', () => {
  const OLD = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = SECRET; });
  afterAll(() => { process.env.JWT_SECRET = OLD; });

  const sign = (payload: object, expiresIn = '15m') =>
    jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions);

  it('accepts a genuine access token', () => {
    const r = verifyAccessToken(sign({ userId: 'u1', purpose: 'access' }));
    expect(r.ok).toBe(true);
  });

  it('accepts a legacy token with no purpose claim', () => {
    // Tokens minted before `purpose` existed must keep working until they age
    // out. Tighten this once JWT_REFRESH_EXPIRES_IN has elapsed post-deploy.
    expect(verifyAccessToken(sign({ userId: 'u1' })).ok).toBe(true);
  });

  // These three are the 2FA bypass: all are signed with JWT_SECRET and were
  // previously accepted as bearer tokens.
  it.each([
    ['totp_challenge', 'the 2FA challenge issued BEFORE the second factor'],
    ['password_reset', 'the token emailed in a reset link'],
    ['email_verification', 'the 24h token emailed at signup'],
  ])('rejects a %s token (%s)', (purpose) => {
    const r = verifyAccessToken(sign({ userId: 'u1', purpose }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(purpose);
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ userId: 'u1', purpose: 'access' }, 'other-secret');
    expect(verifyAccessToken(forged).ok).toBe(false);
  });

  it('rejects an expired token', () => {
    const stale = jwt.sign({ userId: 'u1', purpose: 'access' }, SECRET, { expiresIn: -10 });
    expect(verifyAccessToken(stale).ok).toBe(false);
  });

  it('rejects a token with no userId', () => {
    expect(verifyAccessToken(sign({ purpose: 'access' })).ok).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(verifyAccessToken(undefined).ok).toBe(false);
  });

  describe('bearer parsing', () => {
    it('extracts a bearer token case-insensitively', () => {
      expect(bearerFrom('Bearer abc')).toBe('abc');
      expect(bearerFrom('bearer abc')).toBe('abc');
    });
    it('ignores non-bearer schemes', () => {
      expect(bearerFrom('Basic abc')).toBeUndefined();
      expect(bearerFrom('abc')).toBeUndefined();
      expect(bearerFrom(undefined)).toBeUndefined();
    });
    it('verifies straight from a header', () => {
      expect(verifyAuthHeader(`Bearer ${sign({ userId: 'u1' })}`).ok).toBe(true);
    });
  });
});

describe('timing-safe comparison', () => {
  it('matches identical strings', () => {
    expect(timingSafeEqualStr('s3cr3t', 's3cr3t')).toBe(true);
  });
  it('rejects different strings', () => {
    expect(timingSafeEqualStr('s3cr3t', 'wrong')).toBe(false);
  });
  it('rejects a correct prefix', () => {
    expect(timingSafeEqualStr('s3cr3t', 's3cr3t-more')).toBe(false);
  });
  it('does not throw on length mismatch', () => {
    expect(() => timingSafeEqualStr('a', 'bbbbbbbbbb')).not.toThrow();
    expect(timingSafeEqualStr('a', 'bbbbbbbbbb')).toBe(false);
  });
  it('rejects undefined on either side', () => {
    expect(timingSafeEqualStr(undefined, 'x')).toBe(false);
    expect(timingSafeEqualStr('x', undefined)).toBe(false);
    // The H-3 bypass: two undefineds must NOT compare equal.
    expect(timingSafeEqualStr(undefined, undefined)).toBe(false);
  });
});
