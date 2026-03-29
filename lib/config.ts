import path from 'path';
import { assertUploadDirIsPrivate } from '@/lib/uploads';

const VAULT_KEY_REGEX = /^[0-9a-f]{64}$/i;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateVaultKey(key: string): Buffer {
  if (!VAULT_KEY_REGEX.test(key)) {
    throw new Error(
      'VAULT_ENCRYPTION_KEY must be a 64-character hex string.\n' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(key, 'hex');
}

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly dbPath: string;
  readonly vaultEncryptionKey: Buffer;
  readonly uploadDir: string;
  readonly maxFileSizeMB: number;
  readonly certUploadDir: string;
}

function parsePositiveInteger(name: string, rawValue: string | undefined, fallback: number): number {
  const value = rawValue ? parseInt(rawValue, 10) : fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function loadConfig(): AppConfig {
  const vaultKeyHex = requireEnv('VAULT_ENCRYPTION_KEY');
  const uploadDir = assertUploadDirIsPrivate(process.env.UPLOAD_DIR || './storage/uploads');

  return Object.freeze({
    port: parsePositiveInteger('PORT', process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    dbPath: process.env.DB_PATH || './db/toolkit.db',
    vaultEncryptionKey: validateVaultKey(vaultKeyHex),
    uploadDir,
    maxFileSizeMB: parsePositiveInteger('MAX_FILE_SIZE_MB', process.env.MAX_FILE_SIZE_MB, 10),
    certUploadDir: path.join(uploadDir, 'certs'),
  });
}

const config = loadConfig();
export default config;
