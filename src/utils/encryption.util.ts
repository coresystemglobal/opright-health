import crypto from 'crypto';
import { DataType } from 'sequelize-typescript';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be set to a value of at least 32 characters in environment variables'
    );
  }
  // Derive a fixed 32-byte key from the env var using scrypt with a stable salt
  return crypto.scryptSync(key, 'hms-encryption-salt-v1', 32);
}

export class EncryptionUtil {
  /**
   * Encrypts plaintext using AES-256-GCM (authenticated encryption).
   * Output format: iv:authTag:ciphertext (all hex-encoded)
   */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-GCM ciphertext.
   * Verifies the authentication tag to ensure data integrity.
   */
  static decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format. Expected iv:authTag:ciphertext');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /** Our ciphertext shape: iv(32 hex):authTag(32 hex):ciphertext(hex). */
  static isEncrypted(value: unknown): boolean {
    return typeof value === 'string' && /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]*$/i.test(value);
  }

  /**
   * Decrypts if the value is our ciphertext; otherwise returns it unchanged.
   * Lets encrypted columns tolerate legacy plaintext during/after rollout and
   * never throw on read.
   */
  static decryptSafe(value: string): string {
    if (!EncryptionUtil.isEncrypted(value)) return value;
    try {
      return EncryptionUtil.decrypt(value);
    } catch {
      return value;
    }
  }
}

/**
 * Build Sequelize column options that transparently encrypt on write and
 * decrypt on read for a sensitive/medical field. Stored as TEXT (ciphertext
 * is longer than the plaintext). `field` must be the model attribute name.
 *
 *   @Column(encryptedColumn('phone'))
 *   phone?: string;
 */
export function encryptedColumn(field: string, opts: { allowNull?: boolean } = {}) {
  return {
    type: DataType.TEXT,
    allowNull: opts.allowNull ?? true,
    set(this: any, value: string | null | undefined) {
      this.setDataValue(field, value == null || value === '' ? value : EncryptionUtil.encrypt(value));
    },
    get(this: any): string | null | undefined {
      const raw = this.getDataValue(field);
      return raw == null ? raw : EncryptionUtil.decryptSafe(raw);
    }
  };
}
