import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { getSessionFromCookies } from '@/lib/auth-session';
import { isAppAuthDisabled, sanitizeRedirectPath } from '@/lib/auth';
import * as AuthUserModel from '@/models/auth-user.model';
import AuthPanel from '@/components/auth/AuthPanel';

export const metadata: Metadata = { title: 'Access' };

interface AuthPageProps {
  searchParams: Promise<{
    mode?: string;
    next?: string;
  }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  if (isAppAuthDisabled(process.env)) {
    redirect('/');
  }

  const params = await searchParams;
  const [session, userCount] = await Promise.all([
    getSessionFromCookies(),
    AuthUserModel.count(db),
  ]);

  const hasUsers = userCount > 0;
  const canRegister = userCount === 0 || !!session;
  const nextPath = sanitizeRedirectPath(params.next);
  const initialMode =
    params.mode === 'register' && canRegister
      ? 'register'
      : 'login';

  return (
    <AuthPanel
      canRegister={canRegister}
      currentEmail={session?.email ?? null}
      hasUsers={hasUsers}
      initialMode={initialMode}
      nextPath={nextPath}
    />
  );
}
