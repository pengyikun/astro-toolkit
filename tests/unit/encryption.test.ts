import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { encrypt, decrypt } from '../../lib/encryption';

const testKey = crypto.randomBytes(32);

describe('Encryption (AES-256-GCM)', () => {
  // ── Round-trip ──────────────────────────────────────────────────────────

  describe('round-trip encrypt → decrypt', () => {
    it('should decrypt back to original plaintext', () => {
      const plaintext = 'sk_test_abc123def456';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long plaintext', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'pässwörd!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '🔐 Encryption test 日本語 中文 العربية';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON string content', () => {
      const plaintext = JSON.stringify({ api_key: 'sk_test_123', secret: 'whsec_456' });
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual({ api_key: 'sk_test_123', secret: 'whsec_456' });
    });
  });

  // ── Ciphertext properties ───────────────────────────────────────────────

  describe('ciphertext properties', () => {
    it('should produce different ciphertexts for different plaintexts', () => {
      const enc1 = encrypt('plaintext-a', testKey);
      const enc2 = encrypt('plaintext-b', testKey);
      expect(enc1.ct).not.toBe(enc2.ct);
    });

    it('should produce different IVs for same plaintext (randomness)', () => {
      const enc1 = encrypt('same-plaintext', testKey);
      const enc2 = encrypt('same-plaintext', testKey);
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it('should produce different ciphertexts for same plaintext due to random IV', () => {
      const enc1 = encrypt('same-plaintext', testKey);
      const enc2 = encrypt('same-plaintext', testKey);
      expect(enc1.ct).not.toBe(enc2.ct);
    });

    it('should return payload with ct, iv, and tag fields', () => {
      const encrypted = encrypt('test', testKey);
      expect(encrypted).toHaveProperty('ct');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(typeof encrypted.ct).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.tag).toBe('string');
    });

    it('should produce hex-encoded strings', () => {
      const encrypted = encrypt('test', testKey);
      expect(encrypted.ct).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.iv).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.tag).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce IV of expected hex length (12 bytes = 24 hex chars)', () => {
      const encrypted = encrypt('test', testKey);
      expect(encrypted.iv.length).toBe(24);
    });

    it('should produce auth tag of expected hex length (16 bytes = 32 hex chars)', () => {
      const encrypted = encrypt('test', testKey);
      expect(encrypted.tag.length).toBe(32);
    });
  });

  // ── Tampering detection ─────────────────────────────────────────────────

  describe('tampering detection', () => {
    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('sensitive-data', testKey);
      const tampered = { ...encrypted, ct: encrypted.ct.replace(/./g, '0') };
      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encrypt('sensitive-data', testKey);
      const tampered = { ...encrypted, tag: '0'.repeat(32) };
      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should throw on tampered IV', () => {
      const encrypted = encrypt('sensitive-data', testKey);
      const tampered = { ...encrypted, iv: '0'.repeat(24) };
      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should throw when decrypting with wrong key', () => {
      const encrypted = encrypt('sensitive-data', testKey);
      const wrongKey = crypto.randomBytes(32);
      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });
  });

  // ── Empty string ────────────────────────────────────────────────────────

  describe('empty string handling', () => {
    it('should encrypt empty string without error', () => {
      const encrypted = encrypt('', testKey);
      expect(encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
    });

    it('should produce empty ciphertext for empty string', () => {
      const encrypted = encrypt('', testKey);
      expect(encrypted.ct).toBe('');
    });

    it('should round-trip empty string encrypt/decrypt', () => {
      const encrypted = encrypt('', testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe('');
    });
  });

  // ── Invalid inputs ──────────────────────────────────────────────────────

  describe('invalid inputs', () => {
    it('should throw TypeError for non-string plaintext (number)', () => {
      expect(() => encrypt(123 as unknown as string, testKey)).toThrow(TypeError);
      expect(() => encrypt(123 as unknown as string, testKey)).toThrow('plaintext must be a string');
    });

    it('should throw TypeError for non-string plaintext (object)', () => {
      expect(() => encrypt({} as unknown as string, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for non-string plaintext (null)', () => {
      expect(() => encrypt(null as unknown as string, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for non-string plaintext (undefined)', () => {
      expect(() => encrypt(undefined as unknown as string, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for key that is too short', () => {
      const shortKey = crypto.randomBytes(16);
      expect(() => encrypt('test', shortKey)).toThrow(TypeError);
      expect(() => encrypt('test', shortKey)).toThrow('key must be a 32-byte Buffer');
    });

    it('should throw TypeError for key that is too long', () => {
      const longKey = crypto.randomBytes(64);
      expect(() => encrypt('test', longKey)).toThrow(TypeError);
    });

    it('should throw TypeError for non-Buffer key', () => {
      expect(() => encrypt('test', 'not-a-buffer' as unknown as Buffer)).toThrow(TypeError);
    });

    it('should throw TypeError for non-Buffer key on decrypt', () => {
      const encrypted = encrypt('test', testKey);
      expect(() => decrypt(encrypted, 'not-a-buffer' as unknown as Buffer)).toThrow(TypeError);
    });

    it('should throw TypeError for payload missing ct', () => {
      expect(() => decrypt({ ct: '', iv: 'abc', tag: 'def' }, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for payload missing iv', () => {
      expect(() => decrypt({ ct: 'abc', iv: '', tag: 'def' }, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for payload missing tag', () => {
      expect(() => decrypt({ ct: 'abc', iv: 'def', tag: '' }, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for null payload', () => {
      expect(() => decrypt(null as unknown as { ct: string; iv: string; tag: string }, testKey)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined payload', () => {
      expect(() => decrypt(undefined as unknown as { ct: string; iv: string; tag: string }, testKey)).toThrow(TypeError);
    });
  });
});
