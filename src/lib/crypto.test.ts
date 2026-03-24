import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from './crypto';

const VALID_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('crypto', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  describe('encrypt', () => {
    it('returns a non-empty base64 string', () => {
      const result = encrypt('hello');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const first = encrypt('same text');
      const second = encrypt('same text');
      expect(first).not.toBe(second);
    });

    it('throws when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('hello')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('throws when ENCRYPTION_KEY is not 64 hex chars', () => {
      process.env.ENCRYPTION_KEY = 'tooshort';
      expect(() => encrypt('hello')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });
  });

  describe('decrypt', () => {
    it('round-trips a plaintext string', () => {
      const plaintext = 'my secret api key';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('handles empty string', () => {
      expect(decrypt(encrypt(''))).toBe('');
    });

    it('handles unicode characters', () => {
      const plaintext = 'こんにちは 🌟';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('throws when ENCRYPTION_KEY is missing', () => {
      const ciphertext = encrypt('hello');
      delete process.env.ENCRYPTION_KEY;
      expect(() => decrypt(ciphertext)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });
});
