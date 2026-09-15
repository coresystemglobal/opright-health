import crypto from 'crypto';

/**
 * Constant-time string comparison for secrets, signatures and HMAC digests.
 *
 * `a !== b` short-circuits at the first differing byte, so the time it takes to
 * fail leaks how much of a prefix the attacker guessed correctly. That is the
 * standard weakness in webhook signature checks, where an attacker controls the
 * candidate and can retry freely.
 *
 * `crypto.timingSafeEqual` throws when the two buffers differ in length, so the
 * inputs are hashed to a fixed 32 bytes first. Hashing also means the length of
 * the real secret is never revealed by an early return.
 */
export function timingSafeEqualStr(a: string | undefined, b: string | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest();

  return crypto.timingSafeEqual(ha, hb);
}
