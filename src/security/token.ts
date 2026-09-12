import jwt from 'jsonwebtoken';

/**
 * ONE definition of "a valid access token", shared by the HTTP gate and the
 * Socket.IO handshake. Keeping this in a single module is deliberate: an
 * authentication rule that exists in two places is an authentication rule that
 * will eventually differ in two places.
 */

export type TokenResult =
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: string };

export interface AccessTokenPayload {
  userId: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  tenantId?: string;
  purpose?: string;
  [key: string]: unknown;
}

/** Pull a bearer token out of an Authorization header value. */
export function bearerFrom(header?: string): string | undefined {
  if (!header) return undefined;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer') return undefined;
  const token = rest.join('');
  return token || undefined;
}

/**
 * Verify a token and confirm it is an ACCESS token.
 *
 * The purpose check is the fix for audit finding C-4. Password-reset,
 * email-verification and TOTP-challenge tokens are all signed with the same
 * JWT_SECRET; without this check each one is usable as a bearer token, which
 * makes the 2FA challenge token (issued BEFORE the second factor is supplied)
 * a complete 2FA bypass.
 *
 * Tokens minted before `purpose` was introduced carry no such claim, so a
 * missing purpose is accepted as an access token. Once every pre-existing
 * token has expired (JWT_REFRESH_EXPIRES_IN, default 7d), tighten this to
 * require `purpose === 'access'` explicitly.
 */
export function verifyAccessToken(token?: string): TokenResult {
  if (!token) return { ok: false, reason: 'missing bearer token' };

  const secret = process.env.JWT_SECRET;
  if (!secret) return { ok: false, reason: 'JWT_SECRET is not configured' };

  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;

    if (payload.purpose && payload.purpose !== 'access') {
      return {
        ok: false,
        reason: `token purpose '${payload.purpose}' is not valid for API access`,
      };
    }
    if (!payload.userId) {
      return { ok: false, reason: 'token carries no userId' };
    }
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

/** Convenience wrapper for an Authorization header. */
export function verifyAuthHeader(header?: string): TokenResult {
  return verifyAccessToken(bearerFrom(header));
}
