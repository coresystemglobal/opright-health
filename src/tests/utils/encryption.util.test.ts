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
  });

  describe('password hashing', () => {
    it('should hash password', () => {
      const password = 'testPassword123';
      const hash = EncryptionUtil.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify password correctly', () => {
      const password = 'testPassword123';
      const hash = EncryptionUtil.hashPassword(password);
      
      expect(EncryptionUtil.verifyPassword(password, hash)).toBe(true);
      expect(EncryptionUtil.verifyPassword('wrongPassword', hash)).toBe(false);
    });
  });
});