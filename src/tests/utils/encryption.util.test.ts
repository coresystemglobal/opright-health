import { EncryptionUtil } from '../../utils/encryption.util';

describe('EncryptionUtil', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'sensitive patient data';
      const encrypted = EncryptionUtil.encrypt(originalText);
      const decrypted = EncryptionUtil.decrypt(encrypted);
      
      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted values for same input', () => {
      const text = 'test data';
      const encrypted1 = EncryptionUtil.encrypt(text);
      const encrypted2 = EncryptionUtil.encrypt(text);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should detect tampered ciphertext via GCM auth tag', () => {
      const originalText = 'patient SSN: 123-45-6789';
      const encrypted = EncryptionUtil.encrypt(originalText);
      
      // Tamper with the ciphertext (modify last hex char)
      const parts = encrypted.split(':');
      const lastChar = parts[2].slice(-1);
      parts[2] = parts[2].slice(0, -1) + (lastChar === '0' ? '1' : '0');
      const tampered = parts.join(':');
      
      expect(() => EncryptionUtil.decrypt(tampered)).toThrow();
    });

    it('should reject invalid encrypted text format', () => {
      expect(() => EncryptionUtil.decrypt('not-valid-format')).toThrow(
        'Invalid encrypted text format'
      );
    });
  });
});
