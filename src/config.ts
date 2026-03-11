import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

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
  port: number;
  nodeEnv: string;
  dbPath: string;
  vaultEncryptionKey: Buffer;
  sessionSecret: string;
  uploadDir: string;
  maxFileSizeMB: number;
  certUploadDir: string;
}

function loadConfig(): AppConfig {
  const vaultKeyHex = requireEnv('VAULT_ENCRYPTION_KEY');
  const uploadDir = process.env.UPLOAD_DIR || './public/uploads';

  return Object.freeze({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dbPath: process.env.DB_PATH || './db/toolkit.db',
    vaultEncryptionKey: validateVaultKey(vaultKeyHex),
    sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
    uploadDir,
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    certUploadDir: path.join(uploadDir, 'certs'),
  });
}

const config = loadConfig();
export default config;
