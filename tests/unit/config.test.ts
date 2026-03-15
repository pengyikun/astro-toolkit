process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect } from 'vitest';
import config from '../../src/config';

describe('config', () => {
  it('has port as a number', () => {
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThan(0);
  });

  it('has nodeEnv as a string', () => {
    expect(typeof config.nodeEnv).toBe('string');
  });

  it('has vaultEncryptionKey as a 32-byte Buffer', () => {
    expect(Buffer.isBuffer(config.vaultEncryptionKey)).toBe(true);
    expect(config.vaultEncryptionKey.length).toBe(32);
  });

  it('has sessionSecret as a string', () => {
    expect(typeof config.sessionSecret).toBe('string');
    expect(config.sessionSecret.length).toBeGreaterThan(0);
  });

  it('has uploadDir as a string', () => {
    expect(typeof config.uploadDir).toBe('string');
  });

  it('has maxFileSizeMB as a number', () => {
    expect(typeof config.maxFileSizeMB).toBe('number');
    expect(config.maxFileSizeMB).toBeGreaterThan(0);
  });

  it('has certUploadDir containing "certs"', () => {
    expect(typeof config.certUploadDir).toBe('string');
    expect(config.certUploadDir).toContain('certs');
  });

  it('has dbPath as a string', () => {
    expect(typeof config.dbPath).toBe('string');
  });

  it('config object is frozen', () => {
    expect(Object.isFrozen(config)).toBe(true);
  });
});
