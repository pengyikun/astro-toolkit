import path from 'path';
import { access, unlink } from 'fs/promises';

const BYTES_PER_MB = 1024 * 1024;
const LEGACY_PUBLIC_UPLOAD_PREFIX = '/uploads/';
const LEGACY_PUBLIC_UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

export const CERT_STORAGE_DIR = 'certs';

function isWithinDirectory(candidatePath: string, directory: string): boolean {
  const resolvedCandidate = path.resolve(candidatePath);
  const resolvedDirectory = path.resolve(directory);
  return (
    resolvedCandidate === resolvedDirectory ||
    resolvedCandidate.startsWith(`${resolvedDirectory}${path.sep}`)
  );
}

function hasPathTraversal(segments: string[]): boolean {
  return segments.some((segment) => segment === '..');
}

function normalizeStoredPathSegments(storedPath: string): string[] {
  const trimmed = storedPath.replace(/^\/+/, '');
  const segments = trimmed.split(/[\\/]+/).filter(Boolean);
  if (hasPathTraversal(segments)) {
    throw new Error('Invalid stored upload path');
  }
  return segments;
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

export function assertUploadDirIsPrivate(uploadDir: string): string {
  const resolvedUploadDir = path.resolve(uploadDir);
  const publicDir = path.resolve(process.cwd(), 'public');

  if (isWithinDirectory(resolvedUploadDir, publicDir)) {
    throw new Error('UPLOAD_DIR must be outside ./public so uploaded secrets are not web-accessible');
  }

  return resolvedUploadDir;
}

export function buildStoredCertPath(fileName: string): string {
  return path.posix.join(CERT_STORAGE_DIR, fileName);
}

export function assertWithinFileSizeLimit(
  file: { size: number },
  maxFileSizeMB: number,
  label = 'File',
): void {
  const limitBytes = maxFileSizeMB * BYTES_PER_MB;
  if (file.size > limitBytes) {
    throw new Error(`${label} exceeds the ${maxFileSizeMB} MB limit`);
  }
}

export async function resolveStoredUploadPath(
  storedPath: string | null | undefined,
  uploadDir: string,
): Promise<string | null> {
  if (!storedPath) {
    return null;
  }

  const resolvedUploadDir = path.resolve(uploadDir);

  if (path.isAbsolute(storedPath) && !storedPath.startsWith(LEGACY_PUBLIC_UPLOAD_PREFIX)) {
    const resolvedStoredPath = path.resolve(storedPath);
    if (
      !isWithinDirectory(resolvedStoredPath, resolvedUploadDir) &&
      !isWithinDirectory(resolvedStoredPath, LEGACY_PUBLIC_UPLOAD_DIR)
    ) {
      return null;
    }

    return (await pathExists(resolvedStoredPath)) ? resolvedStoredPath : null;
  }

  if (storedPath.startsWith(LEGACY_PUBLIC_UPLOAD_PREFIX)) {
    const publicSegments = normalizeStoredPathSegments(storedPath);
    const legacyPublicPath = path.join(process.cwd(), 'public', ...publicSegments);
    if (await pathExists(legacyPublicPath)) {
      return legacyPublicPath;
    }

    const fallbackPrivatePath = path.join(
      resolvedUploadDir,
      CERT_STORAGE_DIR,
      path.basename(storedPath),
    );
    return (await pathExists(fallbackPrivatePath)) ? fallbackPrivatePath : null;
  }

  const relativeSegments = normalizeStoredPathSegments(storedPath);
  const privatePath = path.join(resolvedUploadDir, ...relativeSegments);
  return (await pathExists(privatePath)) ? privatePath : null;
}

export async function removeStoredUpload(
  storedPath: string | null | undefined,
  uploadDir: string,
): Promise<void> {
  const resolvedPath = await resolveStoredUploadPath(storedPath, uploadDir);
  if (!resolvedPath) {
    return;
  }

  try {
    await unlink(resolvedPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }
}
