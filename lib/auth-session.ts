import { cookies } from 'next/headers';
import type { AuthUser } from '@/types';
import {
  createSignedSessionToken,
  isAppAuthDisabled,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  type AuthSession,
  verifySignedSessionToken,
} from '@/lib/auth';

function cookieOptions(expiresAt?: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt ? new Date(expiresAt) : new Date(0),
  };
}

export async function getSessionFromCookies(): Promise<AuthSession | null> {
  if (isAppAuthDisabled(process.env)) {
    return null;
  }

  const cookieStore = await cookies();
  return verifySignedSessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null,
    process.env,
  );
}

export async function createUserSession(user: Pick<AuthUser, 'id' | 'email'>): Promise<AuthSession> {
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    await createSignedSessionToken(session, process.env),
    cookieOptions(session.expiresAt),
  );

  return session;
}

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', cookieOptions());
}
