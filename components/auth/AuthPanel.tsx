'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { loginAction, registerAction, type AuthActionState } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorCircleIcon, CheckCircleIcon } from '@/components/ui/Icons';

const EMPTY_STATE: AuthActionState = { success: false };

interface AuthPanelProps {
  canRegister: boolean;
  currentEmail: string | null;
  hasUsers: boolean;
  initialMode: 'login' | 'register';
  nextPath: string;
}

function AuthFeedback({ state }: { state: AuthActionState }) {
  if (state.errors?.length) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger-light/70 px-4 py-3 text-sm text-danger"
      >
        <div className="flex items-start gap-3">
          <ErrorCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            {state.errors.map((error, index) => (
              <p key={`${error.field || 'auth'}-${index}`}>
                {error.field ? `${error.field}: ` : ''}
                {error.message}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!state.message) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-success/20 bg-success-light/70 px-4 py-3 text-sm text-success"
    >
      <div className="flex items-start gap-3">
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{state.message}</p>
      </div>
    </div>
  );
}

export default function AuthPanel({
  canRegister,
  currentEmail,
  hasUsers,
  initialMode,
  nextPath,
}: AuthPanelProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginState, loginFormAction, isLoggingIn] = useActionState(loginAction, EMPTY_STATE);
  const [registerState, registerFormAction, isRegistering] = useActionState(registerAction, EMPTY_STATE);

  const heading = mode === 'register'
    ? currentEmail
      ? t('auth.createOperatorTitle')
      : !hasUsers
        ? t('auth.firstOperatorTitle')
        : t('auth.registerTitle')
    : t('auth.returningOperatorTitle');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[31rem] items-center px-4 py-8 sm:px-6">
      <section className="w-full space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="app-brand-lockup">
              <Image
                src="/images/fin-tech-tool-kit-logo.png"
                alt="Astro Toolkit logo"
                width={40}
                height={40}
                className="app-brand-logo"
                priority
              />
              <p className="app-title-mark text-ink">Astro Toolkit</p>
            </div>

            <h1 className="console-title text-[clamp(1.95rem,4vw,2.45rem)]">{heading}</h1>
          </div>

          {currentEmail ? (
            <Link
              href="/"
              className="hidden pt-1 text-sm font-medium text-brand hover:text-brand-dark sm:inline-flex"
            >
              {t('auth.returnToWorkspace')}
            </Link>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[1rem] border border-border bg-panel shadow-sm">
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            {mode === 'login' ? (
              <div className="space-y-4">
                <AuthFeedback state={loginState} />
                <form action={loginFormAction} className="space-y-4">
                  <input type="hidden" name="next" value={nextPath} />
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.email')}</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="ops@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  {canRegister ? (
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="inline-flex text-sm font-medium text-brand hover:text-brand-dark"
                    >
                      {t('auth.registerOperatorPrompt')}
                    </button>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={isLoggingIn || !hasUsers}>
                    {isLoggingIn ? t('auth.signingIn') : t('auth.signInAction')}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <AuthFeedback state={registerState} />
                <form action={registerFormAction} className="space-y-4">
                  <input type="hidden" name="next" value={nextPath} />
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t('auth.email')}</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="ops@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t('auth.password')}</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                    <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">{t('auth.confirmPassword')}</Label>
                    <Input
                      id="register-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="inline-flex text-sm font-medium text-brand hover:text-brand-dark"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                  <Button type="submit" className="w-full" disabled={isRegistering || !canRegister}>
                    {isRegistering ? t('auth.creatingOperator') : t('auth.registerAction')}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {currentEmail ? (
            <div className="border-t border-border px-5 py-3 text-sm text-muted-foreground sm:hidden">
              <Link href="/" className="font-medium text-brand hover:text-brand-dark">
                {t('auth.returnToWorkspace')}
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
