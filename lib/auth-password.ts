import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);

export interface PasswordDigest {
  passwordHash: string;
  passwordSalt: string;
}

export async function hashPassword(password: string): Promise<PasswordDigest> {
  const passwordSalt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, passwordSalt, 64)) as Buffer;

  return {
    passwordHash: derived.toString('hex'),
    passwordSalt,
  };
}

export async function verifyPassword(
  password: string,
  passwordSalt: string,
  passwordHash: string,
): Promise<boolean> {
  const derived = (await scrypt(password, passwordSalt, 64)) as Buffer;
  const stored = Buffer.from(passwordHash, 'hex');

  if (stored.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(stored, derived);
}
