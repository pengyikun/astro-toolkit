'use server';

import { redirect } from 'next/navigation';
import db from '@/lib/db';
import * as AuthUserModel from '@/models/auth-user.model';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';
import type { ValidationError } from '@/types';
import { createUserSession, clearUserSession, getSessionFromCookies } from '@/lib/auth-session';
import { hashPassword, verifyPassword } from '@/lib/auth-password';
import { isAppAuthDisabled, normalizeEmail, sanitizeRedirectPath } from '@/lib/auth';

export interface AuthActionState {
  success: boolean;
  errors?: ValidationError[];
  message?: string;
}

function formatIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): ValidationError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (isAppAuthDisabled(process.env)) {
    redirect('/');
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') || undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: formatIssues(parsed.error.issues) };
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await AuthUserModel.findByEmail(db, email);
  if (!user) {
    return {
      success: false,
      errors: [{ field: 'email', message: 'Invalid email or password.' }],
    };
  }

  const validPassword = await verifyPassword(
    parsed.data.password,
    user.password_salt,
    user.password_hash,
  );

  if (!validPassword) {
    return {
      success: false,
      errors: [{ field: 'password', message: 'Invalid email or password.' }],
    };
  }

  await createUserSession(user);
  redirect(sanitizeRedirectPath(parsed.data.next));
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (isAppAuthDisabled(process.env)) {
    redirect('/');
  }

  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    next: formData.get('next') || undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: formatIssues(parsed.error.issues) };
  }

  const [currentSession, userCount] = await Promise.all([
    getSessionFromCookies(),
    AuthUserModel.count(db),
  ]);

  const canRegister = userCount === 0 || !!currentSession;
  if (!canRegister) {
    return {
      success: false,
      errors: [{ field: '', message: 'Registration is closed. Sign in with an existing operator account.' }],
    };
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await AuthUserModel.findByEmail(db, email);
  if (existingUser) {
    return {
      success: false,
      errors: [{ field: 'email', message: 'An operator with this email already exists.' }],
    };
  }

  const digest = await hashPassword(parsed.data.password);
  const user = await AuthUserModel.create(db, {
    email,
    password_hash: digest.passwordHash,
    password_salt: digest.passwordSalt,
  });

  if (userCount === 0 || !currentSession) {
    await createUserSession(user);
    redirect(sanitizeRedirectPath(parsed.data.next));
  }

  return {
    success: true,
    message: `Operator ${user.email} created.`,
  };
}

export async function logoutAction(): Promise<void> {
  await clearUserSession();
  redirect('/auth');
}
