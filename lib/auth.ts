const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE_NAME = 'astro_toolkit_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export interface AuthSession {
  userId: number;
  email: string;
  expiresAt: number;
}

function normalizeBase64Padding(value: string): string {
  return value + '='.repeat((4 - (value.length % 4 || 4)) % 4);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = normalizeBase64Padding(
    value.replace(/-/g, '+').replace(/_/g, '/'),
  );
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function utf8ToBase64Url(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToUtf8(value: string): string {
  return decoder.decode(base64UrlToBytes(value));
}

function resolveSessionSecret(env: Record<string, string | undefined>): string {
  const secret = env.AUTH_SECRET?.trim() || env.VAULT_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error('AUTH_SECRET or VAULT_ENCRYPTION_KEY must be set for app auth');
  }

  return secret;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signPayload(payload: string, env: Record<string, string | undefined>): Promise<string> {
  const key = await importHmacKey(resolveSessionSecret(env));
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function isAppAuthDisabled(env: Record<string, string | undefined>): boolean {
  return env.APP_AUTH_DISABLED === 'true';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

export async function createSignedSessionToken(
  session: AuthSession,
  env: Record<string, string | undefined>,
): Promise<string> {
  const payload = utf8ToBase64Url(JSON.stringify(session));
  const signature = await signPayload(payload, env);
  return `${payload}.${signature}`;
}

export async function verifySignedSessionToken(
  token: string | null | undefined,
  env: Record<string, string | undefined>,
): Promise<AuthSession | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  try {
    const key = await importHmacKey(resolveSessionSecret(env));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      toArrayBuffer(base64UrlToBytes(signature)),
      encoder.encode(payload),
    );

    if (!isValid) {
      return null;
    }

    const session = JSON.parse(base64UrlToUtf8(payload)) as AuthSession;

    if (
      typeof session.userId !== 'number' ||
      typeof session.email !== 'string' ||
      typeof session.expiresAt !== 'number'
    ) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
