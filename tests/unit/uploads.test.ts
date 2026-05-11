import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import {
  assertUploadDirIsPrivate,
  assertWithinFileSizeLimit,
  buildStoredCertPath,
  resolveStoredUploadPath,
  removeStoredUpload,
  CERT_STORAGE_DIR,
} from '../../lib/uploads';

let workspace: string;
let uploadDir: string;

beforeAll(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), 'astro-uploads-'));
  uploadDir = path.join(workspace, 'storage');
  await mkdir(path.join(uploadDir, CERT_STORAGE_DIR), { recursive: true });
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('assertUploadDirIsPrivate', () => {
  it('passes when path is outside ./public', () => {
    expect(() => assertUploadDirIsPrivate('/var/data/private')).not.toThrow();
  });

  it('rejects ./public itself', () => {
    expect(() => assertUploadDirIsPrivate(path.resolve(process.cwd(), 'public'))).toThrow(/UPLOAD_DIR/);
  });

  it('rejects a subdir of ./public', () => {
    expect(() => assertUploadDirIsPrivate(path.resolve(process.cwd(), 'public', 'uploads'))).toThrow(/UPLOAD_DIR/);
  });

  it('returns the resolved path on success', () => {
    const out = assertUploadDirIsPrivate(uploadDir);
    expect(out).toBe(path.resolve(uploadDir));
  });
});

describe('assertWithinFileSizeLimit', () => {
  it('accepts files within the limit', () => {
    expect(() => assertWithinFileSizeLimit({ size: 1024 }, 1)).not.toThrow();
  });
  it('rejects files exceeding the limit', () => {
    expect(() => assertWithinFileSizeLimit({ size: 2 * 1024 * 1024 }, 1)).toThrow(/exceeds the 1 MB/);
  });
  it('uses the supplied label in the error message', () => {
    expect(() => assertWithinFileSizeLimit({ size: 99_999_999 }, 1, 'Cert')).toThrow(/^Cert/);
  });
  it('boundary: equal-to-limit passes', () => {
    expect(() => assertWithinFileSizeLimit({ size: 1024 * 1024 }, 1)).not.toThrow();
  });
});

describe('buildStoredCertPath', () => {
  it('joins via posix separator', () => {
    expect(buildStoredCertPath('foo.pem')).toBe('certs/foo.pem');
  });
});

describe('resolveStoredUploadPath', () => {
  beforeEach(async () => {
    await rm(path.join(uploadDir, CERT_STORAGE_DIR), { recursive: true, force: true });
    await mkdir(path.join(uploadDir, CERT_STORAGE_DIR), { recursive: true });
  });

  it('returns null for empty input', async () => {
    expect(await resolveStoredUploadPath(null, uploadDir)).toBeNull();
    expect(await resolveStoredUploadPath('', uploadDir)).toBeNull();
  });

  it('resolves a relative stored path that exists', async () => {
    const rel = path.posix.join(CERT_STORAGE_DIR, 'a.pem');
    await writeFile(path.join(uploadDir, CERT_STORAGE_DIR, 'a.pem'), 'X');
    const out = await resolveStoredUploadPath(rel, uploadDir);
    expect(out).toBe(path.join(uploadDir, CERT_STORAGE_DIR, 'a.pem'));
  });

  it('returns null when the file does not exist', async () => {
    expect(await resolveStoredUploadPath('certs/missing.pem', uploadDir)).toBeNull();
  });

  it('rejects path traversal in stored paths', async () => {
    await expect(
      resolveStoredUploadPath('../../etc/passwd', uploadDir),
    ).rejects.toThrow(/Invalid stored upload path/);
  });

  it('rejects absolute paths outside uploadDir', async () => {
    expect(await resolveStoredUploadPath('/etc/passwd', uploadDir)).toBeNull();
  });
});

describe('removeStoredUpload', () => {
  it('is a no-op for null/empty', async () => {
    await expect(removeStoredUpload(null, uploadDir)).resolves.toBeUndefined();
    await expect(removeStoredUpload('', uploadDir)).resolves.toBeUndefined();
  });

  it('removes an existing file', async () => {
    const rel = path.posix.join(CERT_STORAGE_DIR, 'b.pem');
    await writeFile(path.join(uploadDir, CERT_STORAGE_DIR, 'b.pem'), 'B');
    await removeStoredUpload(rel, uploadDir);
    expect(await resolveStoredUploadPath(rel, uploadDir)).toBeNull();
  });

  it('does not throw when file is already gone', async () => {
    await expect(
      removeStoredUpload('certs/never-existed.pem', uploadDir),
    ).resolves.toBeUndefined();
  });
});
