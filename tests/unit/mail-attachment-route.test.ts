process.env.VAULT_ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || 'a'.repeat(64);
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-auth-secret-0123456789abcdef';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest } from 'next/server';
import { createSignedAttachmentDownloadToken } from '../../lib/auth';
import { ATTACHMENT_DIR } from '../../lib/mail';

const accessMocks = vi.hoisted(() => ({
  getAccessScope: vi.fn(),
}));

vi.mock('@/lib/access', () => ({
  getAccessScope: accessMocks.getAccessScope,
}));

describe('mail attachment download route', () => {
  beforeEach(() => {
    accessMocks.getAccessScope.mockReset();
  });

  afterEach(async () => {
    delete process.env.APP_AUTH_DISABLED;
    await rm(ATTACHMENT_DIR, { recursive: true, force: true });
  });

  it('requires a valid signed token that matches the current user and requested file', async () => {
    const { GET } = await import('../../app/api/mail/attachments/[downloadId]/[filename]/route');
    const downloadId = 'download-123';
    const filename = 'invoice.pdf';
    const fileDir = path.join(ATTACHMENT_DIR, downloadId);
    await mkdir(fileDir, { recursive: true });
    await writeFile(path.join(fileDir, filename), 'payload');

    accessMocks.getAccessScope.mockResolvedValue({ userId: 7, role: 'operator' });

    const validToken = await createSignedAttachmentDownloadToken(
      {
        downloadId,
        filename,
        ownerUserId: 7,
        expiresAt: Date.now() + 60_000,
      },
      process.env,
    );

    const okResponse = await GET(
      new NextRequest(`http://localhost/api/mail/attachments/${downloadId}/${filename}?token=${encodeURIComponent(validToken)}`),
      { params: Promise.resolve({ downloadId, filename }) },
    );
    expect(okResponse.status).toBe(200);
    expect(okResponse.headers.get('cache-control')).toBe('no-store');

    const wrongUserToken = await createSignedAttachmentDownloadToken(
      {
        downloadId,
        filename,
        ownerUserId: 9,
        expiresAt: Date.now() + 60_000,
      },
      process.env,
    );

    const deniedResponse = await GET(
      new NextRequest(`http://localhost/api/mail/attachments/${downloadId}/${filename}?token=${encodeURIComponent(wrongUserToken)}`),
      { params: Promise.resolve({ downloadId, filename }) },
    );
    expect(deniedResponse.status).toBe(404);

    const missingTokenResponse = await GET(
      new NextRequest(`http://localhost/api/mail/attachments/${downloadId}/${filename}`),
      { params: Promise.resolve({ downloadId, filename }) },
    );
    expect(missingTokenResponse.status).toBe(404);
  });

  it('allows null-owner token when APP_AUTH_DISABLED is true', async () => {
    process.env.APP_AUTH_DISABLED = 'true';
    const { GET } = await import('../../app/api/mail/attachments/[downloadId]/[filename]/route');
    const downloadId = 'download-auth-disabled';
    const filename = 'report.pdf';
    const fileDir = path.join(ATTACHMENT_DIR, downloadId);
    await mkdir(fileDir, { recursive: true });
    await writeFile(path.join(fileDir, filename), 'payload');

    accessMocks.getAccessScope.mockResolvedValue({ userId: 0, role: 'operator' });

    const token = await createSignedAttachmentDownloadToken(
      {
        downloadId,
        filename,
        ownerUserId: null,
        expiresAt: Date.now() + 60_000,
      },
      process.env,
    );

    const response = await GET(
      new NextRequest(`http://localhost/api/mail/attachments/${downloadId}/${filename}?token=${encodeURIComponent(token)}`),
      { params: Promise.resolve({ downloadId, filename }) },
    );
    expect(response.status).toBe(200);
  });

  it('rejects null-owner token when auth is enabled', async () => {
    delete process.env.APP_AUTH_DISABLED;
    const { GET } = await import('../../app/api/mail/attachments/[downloadId]/[filename]/route');
    const downloadId = 'download-auth-enabled';
    const filename = 'secret.pdf';
    const fileDir = path.join(ATTACHMENT_DIR, downloadId);
    await mkdir(fileDir, { recursive: true });
    await writeFile(path.join(fileDir, filename), 'payload');

    accessMocks.getAccessScope.mockResolvedValue({ userId: 5, role: 'operator' });

    const token = await createSignedAttachmentDownloadToken(
      {
        downloadId,
        filename,
        ownerUserId: null,
        expiresAt: Date.now() + 60_000,
      },
      process.env,
    );

    const response = await GET(
      new NextRequest(`http://localhost/api/mail/attachments/${downloadId}/${filename}?token=${encodeURIComponent(token)}`),
      { params: Promise.resolve({ downloadId, filename }) },
    );
    expect(response.status).toBe(404);
  });
});
