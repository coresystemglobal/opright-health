import { User } from '../../models';
import qrcode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TOTP_REQUIRED_ROLES = ['admin', 'super_admin', 'doctor', 'nurse'];
const BACKUP_CODE_COUNT = 8;
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`FATAL: ${name} must be defined in environment variables`);
  return value;
}

// --- Base32 helpers (RFC 4648, no padding) ---
function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/\s/g, '').toUpperCase();
  const output: number[] = [];
  let bits = 0, value = 0;
  for (const ch of clean) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// --- TOTP (RFC 6238) ---
function totpGenerate(secret: string, offset = 0, digits = 6, step = 30): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / step) + offset;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0xf;
  const code = (
    ((hmac[off] & 0x7f) << 24) |
    ((hmac[off + 1] & 0xff) << 16) |
    ((hmac[off + 2] & 0xff) << 8) |
    (hmac[off + 3] & 0xff)
  ) % Math.pow(10, digits);
  return code.toString().padStart(digits, '0');
}

function totpVerify(token: string, secret: string, window = 1): boolean {
  for (let w = -window; w <= window; w++) {
    if (totpGenerate(secret, w) === token) return true;
  }
  return false;
}

function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function keyUri(email: string, issuer: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// --- AES-256-CBC encryption for the stored TOTP secret ---
function encryptSecret(secret: string): string {
  const key = crypto.createHash('sha256').update(requireEnv('TOTP_ENCRYPTION_KEY')).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return iv.toString('hex') + ':' + cipher.update(secret, 'utf8', 'hex') + cipher.final('hex');
}

function decryptSecret(encryptedSecret: string): string {
  const key = crypto.createHash('sha256').update(requireEnv('TOTP_ENCRYPTION_KEY')).digest();
  const [ivHex, enc] = encryptedSecret.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
}

function generateRawBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}

export function isTotpRequiredRole(roleName: string): boolean {
  return TOTP_REQUIRED_ROLES.includes(roleName.toLowerCase());
}

export const twofaService = {
  setup: async (userId: string) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    if (user.totp_enabled) throw new Error('2FA is already enabled');

    const secret = generateSecret();
    const appName = process.env.APP_NAME || 'HMS';
    const otpAuthUrl = keyUri(user.email, appName, secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    user.totp_secret = encryptSecret(secret);
    await user.save();

    return { qrCodeDataUrl, secret };
  },

  enable: async (userId: string, totpCode: string) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    if (!user.totp_secret) throw new Error('Run 2FA setup first');
    if (user.totp_enabled) throw new Error('2FA is already enabled');

    const secret = decryptSecret(user.totp_secret);
    if (!totpVerify(totpCode, secret)) throw new Error('Invalid authenticator code');

    const backupCodes = generateRawBackupCodes();
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedCodes = await Promise.all(backupCodes.map(c => bcrypt.hash(c, saltRounds)));

    user.totp_enabled = true;
    user.totp_backup_codes = hashedCodes;
    await user.save();

    return { backupCodes };
  },

  verifyLogin: async (tempToken: string, totpCode: string) => {
    const jwtSecret = requireEnv('JWT_SECRET');
    const jwtRefreshSecret = requireEnv('JWT_REFRESH_SECRET');
    const jwtExpiry = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
    const jwtRefreshExpiry = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, jwtSecret);
    } catch {
      throw new Error('Invalid or expired challenge token');
    }

    if (decoded.purpose !== 'totp_challenge') throw new Error('Invalid token purpose');

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) throw new Error('User not found or inactive');
    if (!user.totp_secret) throw new Error('2FA not configured');

    const secret = decryptSecret(user.totp_secret);
    const isValidTotp = totpVerify(totpCode, secret);

    if (!isValidTotp) {
      // Try backup codes
      const normalizedCode = totpCode.replace(/[-\s]/g, '').toUpperCase();
      const codes: string[] = Array.isArray(user.totp_backup_codes) ? user.totp_backup_codes : [];
      let consumed = false;
      const remaining: string[] = [];

      for (const hashed of codes) {
        const match = await bcrypt.compare(normalizedCode, hashed);
        if (match && !consumed) {
          consumed = true;
        } else {
          remaining.push(hashed);
        }
      }

      if (!consumed) throw new Error('Invalid authenticator code');

      user.totp_backup_codes = remaining;
      await user.save();
    }

    user.failed_login_attempts = 0;
    user.locked_until = undefined;
    user.last_login_at = new Date();
    await user.save();

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiry });
    const refreshJti = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { userId: user.id, jti: refreshJti },
      jwtRefreshSecret,
      { expiresIn: jwtRefreshExpiry }
    );

    return {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        verified: user.verified,
        is_active: user.is_active,
      },
      tokens: { accessToken, refreshToken },
    };
  },

  disable: async (userId: string, totpCode: string) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    if (!user.totp_enabled || !user.totp_secret) throw new Error('2FA is not enabled');

    const secret = decryptSecret(user.totp_secret);
    if (!totpVerify(totpCode, secret)) throw new Error('Invalid authenticator code');

    user.totp_enabled = false;
    user.totp_secret = undefined;
    user.totp_backup_codes = undefined;
    await user.save();

    return { message: '2FA disabled successfully' };
  },

  regenerateBackupCodes: async (userId: string, totpCode: string) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    if (!user.totp_enabled || !user.totp_secret) throw new Error('2FA is not enabled');

    const secret = decryptSecret(user.totp_secret);
    if (!totpVerify(totpCode, secret)) throw new Error('Invalid authenticator code');

    const backupCodes = generateRawBackupCodes();
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedCodes = await Promise.all(backupCodes.map(c => bcrypt.hash(c, saltRounds)));

    user.totp_backup_codes = hashedCodes;
    await user.save();

    return { backupCodes };
  },

  getStatus: async (userId: string) => {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'totp_enabled', 'totp_backup_codes'],
    });
    if (!user) throw new Error('User not found');

    return {
      enabled: user.totp_enabled || false,
      backupCodesRemaining: Array.isArray(user.totp_backup_codes) ? user.totp_backup_codes.length : 0,
    };
  },
};
