/**
 * Normalizes a phone number to E.164 (e.g. +2348012345678).
 *
 * Rules:
 *  - strips spaces, dashes, parentheses
 *  - a leading "+" is kept as-is (assumed already international)
 *  - a leading "00" international prefix becomes "+"
 *  - a national number starting "0" is expanded using DEFAULT_COUNTRY_CODE
 *    (defaults to 234 / Nigeria, matching VTpass being the primary provider)
 *  - a bare number without country code gets DEFAULT_COUNTRY_CODE prepended
 *
 * Returns null when the input has too few digits to be a real number.
 */
export function toE164(input: string, defaultCountryCode = process.env.SMS_DEFAULT_COUNTRY_CODE || '234'): string | null {
  if (!input) return null;

  let raw = input.trim();
  const hasPlus = raw.startsWith('+');

  // Keep only digits
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;

  if (hasPlus) {
    // Already international
    return digits.length >= 10 ? `+${digits}` : null;
  }

  // 00 international prefix → +
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
    return digits.length >= 10 ? `+${digits}` : null;
  }

  const cc = defaultCountryCode.replace(/\D/g, '');

  // National format: leading 0 replaced by country code
  if (digits.startsWith('0')) {
    digits = cc + digits.slice(1);
    return `+${digits}`;
  }

  // Already starts with the country code
  if (digits.startsWith(cc) && digits.length >= 11) {
    return `+${digits}`;
  }

  // Bare subscriber number — prepend country code
  if (digits.length >= 7 && digits.length <= 12) {
    return `+${cc}${digits}`;
  }

  return digits.length >= 10 ? `+${digits}` : null;
}
