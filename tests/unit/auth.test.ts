process.env.VAULT_ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || 'a'.repeat(64);

import { describe, expect, it } from 'vitest';
import {
  createSignedAttachmentDownloadToken,
  createSignedSessionToken,
  isAppAuthDisabled,
  normalizeEmail,
  sanitizeRedirectPath,
  verifySignedAttachmentDownloadToken,
  verifySignedSessionToken,
} from '../../lib/auth';
import { hashPassword, verifyPassword } from '../../lib/auth-password';

describe('auth session tokens', () => {
  it('round-trips a valid signed session token', async () => {
    const token = await createSignedSessionToken(
      {
        userId: 7,
        email: 'operator@example.test',
        expiresAt: Date.now() + 60_000,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedSessionToken(token, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toEqual({
      userId: 7,
      email: 'operator@example.test',
      expiresAt: expect.any(Number),
    });
  });

  it('rejects expired or tampered tokens', async () => {
    const expired = await createSignedSessionToken(
      {
        userId: 1,
        email: 'operator@example.test',
        expiresAt: Date.now() - 1,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedSessionToken(expired, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toBeNull();

    const active = await createSignedSessionToken(
      {
        userId: 1,
        email: 'operator@example.test',
        expiresAt: Date.now() + 60_000,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedSessionToken(`${active}x`, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toBeNull();
  });
});

describe('attachment download tokens', () => {
  it('round-trips a valid signed attachment download token', async () => {
    const token = await createSignedAttachmentDownloadToken(
      {
        downloadId: 'download-123',
        filename: 'invoice.pdf',
        ownerUserId: 7,
        expiresAt: Date.now() + 60_000,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedAttachmentDownloadToken(token, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toEqual({
      downloadId: 'download-123',
      filename: 'invoice.pdf',
      ownerUserId: 7,
      expiresAt: expect.any(Number),
    });
  });

  it('rejects expired, tampered, or malformed attachment download tokens', async () => {
    const expired = await createSignedAttachmentDownloadToken(
      {
        downloadId: 'download-123',
        filename: 'invoice.pdf',
        ownerUserId: 7,
        expiresAt: Date.now() - 1,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedAttachmentDownloadToken(expired, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toBeNull();

    const active = await createSignedAttachmentDownloadToken(
      {
        downloadId: 'download-123',
        filename: 'invoice.pdf',
        ownerUserId: 7,
        expiresAt: Date.now() + 60_000,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedAttachmentDownloadToken(`${active}x`, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toBeNull();

    const malformed = await createSignedSessionToken(
      {
        userId: 7,
        email: 'operator@example.test',
        expiresAt: Date.now() + 60_000,
      },
      { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    );

    await expect(
      verifySignedAttachmentDownloadToken(malformed, { VAULT_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).resolves.toBeNull();
  });
});

describe('password hashing', () => {
  it('verifies the original password and rejects the wrong one', async () => {
    const digest = await hashPassword('correct horse battery staple');

    await expect(
      verifyPassword('correct horse battery staple', digest.passwordSalt, digest.passwordHash),
    ).resolves.toBe(true);

    await expect(
      verifyPassword('wrong password', digest.passwordSalt, digest.passwordHash),
    ).resolves.toBe(false);
  });
});

describe('auth helpers', () => {
  it('normalizes emails and redirect paths', () => {
    expect(normalizeEmail('  OPERATOR@Example.test ')).toBe('operator@example.test');
    expect(sanitizeRedirectPath('/vault?tab=all')).toBe('/vault?tab=all');
    expect(sanitizeRedirectPath('https://example.com')).toBe('/');
    expect(sanitizeRedirectPath('//example.com')).toBe('/');
  });

  it('respects the auth bypass flag', () => {
    expect(isAppAuthDisabled({ APP_AUTH_DISABLED: 'true' })).toBe(true);
    expect(isAppAuthDisabled({ APP_AUTH_DISABLED: 'false' })).toBe(false);
  });
});
