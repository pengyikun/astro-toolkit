import crypto from 'crypto';
import type { EncryptedPayload } from '../types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const ENCODING = 'hex' as const;

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  if (typeof plaintext !== 'string') throw new TypeError('plaintext must be a string');
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new TypeError('key must be a 32-byte Buffer');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ct = cipher.update(plaintext, 'utf8', ENCODING);
  ct += cipher.final(ENCODING);
  return { ct, iv: iv.toString(ENCODING), tag: cipher.getAuthTag().toString(ENCODING) };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  if (!payload?.ct || !payload?.iv || !payload?.tag) throw new TypeError('Invalid encrypted payload');
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new TypeError('key must be a 32-byte Buffer');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, ENCODING));
  decipher.setAuthTag(Buffer.from(payload.tag, ENCODING));
  let decrypted = decipher.update(payload.ct, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
